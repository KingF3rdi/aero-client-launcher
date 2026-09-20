//! Installs (if needed) and launches a vanilla or Fabric instance.
//!
//! This intentionally hardcodes the standard, stable `--username/--uuid/...`
//! argument list that every 1.13+ client accepts, rather than parsing Mojang's
//! full conditional `arguments.game`/`arguments.jvm` rule DSL from the version
//! JSON - that DSL mostly exists to toggle optional things (demo mode, old
//! resolution flags, quick-play) that this launcher doesn't offer yet, and
//! hand-rolling the common case is far less likely to silently break than a
//! partial parser for the uncommon case. Same reasoning for natives: 1.19+
//! ships LWJGL's own per-OS classifier jars straight on the classpath, so
//! there's no separate native-extraction step to get right here.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Mutex;

use tauri::{Emitter, Manager};

/// Windows CREATE_NO_WINDOW: java.exe is a console-subsystem program, so
/// without this Windows pops up a blank console window for it every launch
/// (stdout/stderr are already redirected to launcher.log, so nothing would
/// show in it anyway - it'd just flash on screen and worry people).
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;
/// Windows HIGH_PRIORITY_CLASS: the game gets scheduled ahead of background apps.
#[cfg(windows)]
const HIGH_PRIORITY_CLASS: u32 = 0x00000080;

/// Tells Windows to run this java on the fast (discrete) GPU instead of the integrated one.
#[cfg(windows)]
fn prefer_high_performance_gpu(java: &str) {
    use std::os::windows::process::CommandExt;
    let _ = std::process::Command::new("reg")
        .args(["add", r"HKCU\Software\Microsoft\DirectX\UserGpuPreferences", "/v"])
        .arg(java)
        .args(["/t", "REG_SZ", "/d", "GpuPreference=2;", "/f"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::instances::{self, Instance};

const VERSION_MANIFEST: &str = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LaunchAccount {
    pub name: String,
    pub uuid: String,
    pub mc_token: String,
}

/// Tracks currently-running game processes by instance id, so `stop_instance`
/// can kill one and the exit-watcher task can tell the frontend when it ends
/// on its own (crash or the player quitting normally).
#[derive(Default)]
pub struct GameState {
    children: Mutex<HashMap<String, tokio::process::Child>>,
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("AeroClient/0.1")
        .build()
        .expect("failed to build http client")
}

/// Best-effort append to the instance's launcher.log - a launch that fails
/// before ever spawning java (bad manifest, a download that errors out, no
/// disk space, ...) used to vanish with nothing written anywhere; every
/// stage now leaves a trace so a failure is diagnosable from the Logs tab
/// instead of just an ephemeral toast.
fn log_line(log_path: &Path, line: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(f, "{line}");
    }
}

#[tauri::command]
pub async fn launch_instance(
    instance_id: String,
    ram_gb: u32,
    account: LaunchAccount,
    app: tauri::AppHandle,
    state: tauri::State<'_, GameState>,
) -> Result<(), String> {
    let dir = instances::instance_dir(&instance_id);
    let _ = std::fs::create_dir_all(&dir);
    let log_path = dir.join("launcher.log");
    let _ = std::fs::write(&log_path, "");

    match launch_inner(&instance_id, ram_gb, &account, &dir, &log_path, &app, &state).await {
        Ok(()) => Ok(()),
        Err(e) => {
            log_line(&log_path, &format!("Start fehlgeschlagen: {e}"));
            Err(e)
        }
    }
}

async fn launch_inner(
    instance_id: &str,
    ram_gb: u32,
    account: &LaunchAccount,
    dir: &Path,
    log_path: &Path,
    app: &tauri::AppHandle,
    state: &tauri::State<'_, GameState>,
) -> Result<(), String> {
    let instance = instances::find(instance_id).ok_or("Unbekannte Instanz")?;
    let effective_ram_gb = instance.ram_gb.unwrap_or(ram_gb);

    let java = find_java().ok_or("Java wurde nicht gefunden. Bitte JDK 21+ installieren.")?;

    let http = client();
    log_line(log_path, "Lade Versions-Manifest...");
    let manifest: Value = http
        .get(VERSION_MANIFEST)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let version_url = manifest["versions"]
        .as_array()
        .and_then(|versions| versions.iter().find(|v| v["id"] == instance.mc_version.as_str()))
        .and_then(|v| v["url"].as_str())
        .ok_or(format!("Version {} nicht in Mojangs Manifest gefunden", instance.mc_version))?
        .to_string();

    let version_json: Value = http.get(&version_url).send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;

    let mut classpath: Vec<PathBuf> = Vec::new();

    // Client jar
    log_line(log_path, "Lade Client-Jar...");
    let client_jar = dir
        .join("versions")
        .join(&instance.mc_version)
        .join(format!("{}.jar", instance.mc_version));
    if let Some(url) = version_json["downloads"]["client"]["url"].as_str() {
        download_if_missing(&http, url, &client_jar).await?;
    }
    classpath.push(client_jar);

    // Vanilla libraries
    log_line(log_path, "Lade Bibliotheken...");
    if let Some(libs) = version_json["libraries"].as_array() {
        download_libraries(&http, dir, libs, &mut classpath).await?;
    }

    // Assets (asset index + objects) - not on the classpath, just needs to be
    // on disk before launch so the client can find sounds/textures/language files.
    log_line(log_path, "Lade Assets (kann beim ersten Start dauern)...");
    if let Some(asset_index_url) = version_json["assetIndex"]["url"].as_str() {
        let asset_index_id = version_json["assetIndex"]["id"].as_str().unwrap_or("legacy");
        download_assets(&http, dir, asset_index_url, asset_index_id).await?;
    }
    let assets_dir = dir.join("assets");
    let asset_index_id = version_json["assetIndex"]["id"].as_str().unwrap_or("legacy").to_string();

    let mut main_class = version_json["mainClass"]
        .as_str()
        .unwrap_or("net.minecraft.client.main.Main")
        .to_string();

    if instance.loader == "fabric" {
        log_line(log_path, "Installiere Fabric Loader...");
        main_class = install_fabric(&http, dir, &instance.mc_version, &mut classpath).await?;
        ensure_sodium(dir, &instance, log_path).await;
    }

    ensure_mod_jar(dir, &instance, log_path).await?;
    ensure_optimized_options(dir);

    let natives_placeholder = dir.join("versions").join(&instance.mc_version).join("natives");
    std::fs::create_dir_all(&natives_placeholder).map_err(|e| e.to_string())?;

    let cp = std::env::join_paths(classpath.iter()).map_err(|e| e.to_string())?;

    // A GUI app has no console for the child to inherit, so without this any
    // early JVM failure (bad classpath, missing class, native-library error)
    // vanishes silently instead of reaching the Logs tab - append to the same
    // log the pre-spawn stages above already wrote to.
    let launcher_log = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| e.to_string())?;
    let launcher_log_err = launcher_log.try_clone().map_err(|e| e.to_string())?;

    log_line(log_path, "Starte Java...");
    let mut cmd = tokio::process::Command::new(&java);
    cmd.current_dir(dir)
        .arg(format!("-Xmx{effective_ram_gb}G"))
        // Fixed-size heap: no resize pauses while playing.
        .arg(format!("-Xms{effective_ram_gb}G"))
        // GC tuning for smooth frame times: short, frequent young collections instead of long pauses.
        .args([
            "-XX:+UnlockExperimentalVMOptions",
            "-XX:+UseG1GC",
            "-XX:G1NewSizePercent=30",
            "-XX:G1MaxNewSizePercent=40",
            "-XX:G1HeapRegionSize=16M",
            "-XX:G1ReservePercent=20",
            "-XX:MaxGCPauseMillis=40",
            "-XX:+ParallelRefProcEnabled",
            "-XX:+DisableExplicitGC",
            "-XX:ReservedCodeCacheSize=400M",
            "-XX:+PerfDisableSharedMem",
            "-XX:-DontCompileHugeMethods",
        ])
        .arg(format!("-Djava.library.path={}", natives_placeholder.display()))
        .arg("-cp")
        .arg(cp)
        .arg(&main_class)
        .arg("--username")
        .arg(&account.name)
        .arg("--version")
        .arg(&instance.name)
        .arg("--gameDir")
        .arg(dir.display().to_string())
        .arg("--assetsDir")
        .arg(assets_dir.display().to_string())
        .arg("--assetIndex")
        .arg(&asset_index_id)
        .arg("--uuid")
        .arg(&account.uuid)
        .arg("--accessToken")
        .arg(&account.mc_token)
        .arg("--userType")
        .arg("msa")
        .arg("--versionType")
        .arg("release")
        .stdin(Stdio::null())
        .stdout(Stdio::from(launcher_log))
        .stderr(Stdio::from(launcher_log_err))
        .kill_on_drop(true);
    #[cfg(windows)]
    {
        prefer_high_performance_gpu(&java);
        cmd.creation_flags(CREATE_NO_WINDOW | HIGH_PRIORITY_CLASS);
    }

    let child = cmd.spawn().map_err(|e| format!("Minecraft konnte nicht gestartet werden: {e}"))?;

    {
        let mut children = state.children.lock().unwrap();
        children.insert(instance_id.to_string(), child);
    }
    watch_process(app.clone(), instance_id.to_string());
    Ok(())
}

/// Polls the child every couple seconds instead of a blocking `.wait()`, so
/// `stop_instance` can concurrently take the same entry out of the map to
/// kill it without fighting over ownership of the Child.
fn watch_process(app: tauri::AppHandle, instance_id: String) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            let state = app.state::<GameState>();
            let exited = {
                let mut children = state.children.lock().unwrap();
                match children.get_mut(&instance_id) {
                    None => true,
                    Some(child) => match child.try_wait() {
                        Ok(Some(_)) => {
                            children.remove(&instance_id);
                            true
                        }
                        Ok(None) => false,
                        Err(_) => {
                            children.remove(&instance_id);
                            true
                        }
                    },
                }
            };
            if exited {
                let _ = app.emit("game-exited", &instance_id);
                break;
            }
        }
    });
}

/// Kills a running instance's game process - used for both cancelling a
/// launch still stuck downloading/starting and quitting an already-running
/// game from the launcher's own Stop button.
#[tauri::command]
pub async fn stop_instance(instance_id: String, state: tauri::State<'_, GameState>) -> Result<(), String> {
    let child = {
        let mut children = state.children.lock().unwrap();
        children.remove(&instance_id)
    };
    let Some(mut child) = child else { return Ok(()) };
    child.kill().await.map_err(|e| e.to_string())
}

fn find_java() -> Option<String> {
    if which_java().is_some() {
        return which_java();
    }
    if let Ok(home) = std::env::var("JAVA_HOME") {
        let candidate = Path::new(&home).join("bin").join("java.exe");
        if candidate.is_file() {
            return Some(candidate.display().to_string());
        }
    }
    for base in ["C:\\Program Files\\Eclipse Adoptium", "C:\\Program Files\\Java", "C:\\Program Files\\Microsoft"] {
        if let Some(found) = find_java_recursive(Path::new(base), 0) {
            return Some(found.display().to_string());
        }
    }
    None
}

fn which_java() -> Option<String> {
    let path = std::env::var("PATH").ok()?;
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join("java.exe");
        if candidate.is_file() {
            return Some(candidate.display().to_string());
        }
    }
    None
}

fn find_java_recursive(dir: &Path, depth: u32) -> Option<PathBuf> {
    if depth > 4 || !dir.is_dir() {
        return None;
    }
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && path.file_name().map(|n| n == "java.exe").unwrap_or(false) {
            return Some(path);
        }
        if path.is_dir() {
            if let Some(found) = find_java_recursive(&path, depth + 1) {
                return Some(found);
            }
        }
    }
    None
}

async fn download_if_missing(http: &reqwest::Client, url: &str, dest: &Path) -> Result<(), String> {
    if dest.is_file() {
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let bytes = http.get(url).send().await.map_err(|e| e.to_string())?.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())
}

/// True if a library's `rules` (if any) allow it on this OS. Absent rules means "always allow".
fn library_allowed(lib: &Value) -> bool {
    let Some(rules) = lib["rules"].as_array() else {
        return true;
    };
    let mut allowed = false;
    for rule in rules {
        let action_allow = rule["action"] == "allow";
        let os_name = rule["os"]["name"].as_str();
        let matches_os = match os_name {
            Some(name) => name == "windows",
            None => true,
        };
        if matches_os {
            allowed = action_allow;
        }
    }
    allowed
}

async fn download_libraries(
    http: &reqwest::Client,
    dir: &Path,
    libs: &[Value],
    classpath: &mut Vec<PathBuf>,
) -> Result<(), String> {
    let libraries_dir = dir.join("libraries");
    for lib in libs {
        if !library_allowed(lib) {
            continue;
        }
        // Most libraries carry a direct download entry; a few (mostly natives
        // classifiers on older versions) only exist under `classifiers` - skip
        // those here since 1.19+ (this launcher's whole version range) ships
        // natives as ordinary per-OS artifacts instead.
        let Some(artifact) = lib["downloads"]["artifact"].as_object() else {
            continue;
        };
        let (Some(path), Some(url)) = (artifact.get("path").and_then(|v| v.as_str()), artifact.get("url").and_then(|v| v.as_str())) else {
            continue;
        };
        let dest = libraries_dir.join(path);
        download_if_missing(http, url, &dest).await?;
        classpath.push(dest);
    }
    Ok(())
}

async fn download_assets(http: &reqwest::Client, dir: &Path, index_url: &str, index_id: &str) -> Result<(), String> {
    let index: Value = http.get(index_url).send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    let index_path = dir.join("assets").join("indexes").join(format!("{index_id}.json"));
    if let Some(parent) = index_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&index_path, index.to_string()).map_err(|e| e.to_string())?;

    let objects_dir = dir.join("assets").join("objects");
    let Some(objects) = index["objects"].as_object() else {
        return Ok(());
    };
    // Sequential on purpose: a naive fully-parallel fan-out over what can be
    // 5000+ assets on first launch is an easy way to get rate-limited by
    // Mojang's CDN. Later work: bound concurrency instead of none at all.
    for entry in objects.values() {
        let Some(hash) = entry["hash"].as_str() else { continue };
        let sub = &hash[0..2];
        let dest = objects_dir.join(sub).join(hash);
        if dest.is_file() {
            continue;
        }
        let url = format!("https://resources.download.minecraft.net/{sub}/{hash}");
        download_if_missing(http, &url, &dest).await?;
    }
    Ok(())
}

/// Fetches the latest stable Fabric loader for `mc_version`, downloads its
/// libraries (intermediary mappings + loader itself), and returns the Fabric
/// entrypoint main class to launch with.
/// Also used by `content::export_modpack` to fill in a `.mrpack`'s
/// `fabric-loader` dependency, since that's the only piece of loader info an
/// exported instance needs (the rest lives in the copied mod/config files).
pub async fn latest_fabric_loader_version(http: &reqwest::Client, mc_version: &str) -> Result<String, String> {
    let loaders: Value = http
        .get(format!("https://meta.fabricmc.net/v2/versions/loader/{mc_version}"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    loaders
        .as_array()
        .and_then(|l| l.iter().find(|entry| entry["loader"]["stable"] == true))
        .or_else(|| loaders.as_array().and_then(|l| l.first()))
        .and_then(|entry| entry["loader"]["version"].as_str())
        .map(|s| s.to_string())
        .ok_or(format!("Kein Fabric Loader für {mc_version} gefunden"))
}

async fn install_fabric(
    http: &reqwest::Client,
    dir: &Path,
    mc_version: &str,
    classpath: &mut Vec<PathBuf>,
) -> Result<String, String> {
    let loader_version = latest_fabric_loader_version(http, mc_version).await?;

    let profile: Value = http
        .get(format!(
            "https://meta.fabricmc.net/v2/versions/loader/{mc_version}/{loader_version}/profile/json"
        ))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let main_class = profile["mainClass"]
        .as_str()
        .unwrap_or("net.fabricmc.loader.impl.launch.knot.KnotClient")
        .to_string();

    let libraries_dir = dir.join("libraries");
    if let Some(libs) = profile["libraries"].as_array() {
        for lib in libs {
            let Some(name) = lib["name"].as_str() else { continue };
            let repo = lib["url"].as_str().unwrap_or("https://maven.fabricmc.net/");
            let Some(rel_path) = maven_coordinate_to_path(name) else { continue };
            let url = format!("{}{}", repo.trim_end_matches('/'), format!("/{rel_path}"));
            let dest = libraries_dir.join(&rel_path);
            download_if_missing(http, &url, &dest).await?;
            classpath.push(dest);
        }
    }

    Ok(main_class)
}

/// "net.fabricmc:fabric-loader:0.15.0" -> "net/fabricmc/fabric-loader/0.15.0/fabric-loader-0.15.0.jar"
fn maven_coordinate_to_path(coordinate: &str) -> Option<String> {
    let parts: Vec<&str> = coordinate.split(':').collect();
    let (group, artifact, version) = match parts.as_slice() {
        [g, a, v] => (*g, *a, *v),
        _ => return None,
    };
    let group_path = group.replace('.', "/");
    Some(format!("{group_path}/{artifact}/{version}/{artifact}-{version}.jar"))
}

/// Copies the built Aero Client mod jar into this instance's mods folder, if
/// the "Aero Client" toggle is on for this instance (Installation tab in its
/// settings) and one is found next to this launcher's project checkout.
/// Best-effort: a missing/mismatched jar just means this instance launches
/// without the mod rather than failing the whole launch - the jar is only
/// ever built for 1.21.11 today, so the toggle is a no-op on other versions
/// until the mod itself supports them.
async fn ensure_mod_jar(dir: &Path, instance: &Instance, log_path: &Path) -> Result<(), String> {
    if !instance.mod_enabled || instance.mc_version != "1.21.11" {
        return Ok(());
    }
    // Auto-update: pull the newest mod jar from the GitHub release on every start.
    match update_mod_from_github(dir, log_path).await {
        Ok(true) => return Ok(()),
        Ok(false) => {}
        Err(e) => log_line(log_path, &format!("Mod-Update von GitHub fehlgeschlagen: {e}")),
    }
    // Offline / no release yet: fall back to a jar shipped next to the exe (or the dev build).
    let dev_relative = PathBuf::from("../liteclient/build/libs/aero-client-1.21-1.0.0.jar");
    let next_to_exe = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.join("aero-client.jar")));
    let source = [Some(dev_relative), next_to_exe]
        .into_iter()
        .flatten()
        .find(|p| p.is_file());
    let Some(source) = source else {
        return Ok(());
    };
    let mods_dir = dir.join("mods");
    std::fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;
    std::fs::copy(&source, mods_dir.join("aero-client.jar")).map_err(|e| e.to_string())?;
    Ok(())
}

const MOD_COUNTED_URL: &str = "https://aero.gamekni9ht.workers.dev/download/mod";
const MOD_RELEASE_API: &str = "https://api.github.com/repos/KingF3rdi/aero-client-launcher/releases/latest";

/// Returns Ok(true) when the mods folder now holds the latest release jar (already current or freshly
/// downloaded), Ok(false) when there is no release to use.
async fn update_mod_from_github(dir: &Path, log_path: &Path) -> Result<bool, String> {
    let http = reqwest::Client::builder()
        .user_agent("AeroClient-Launcher")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let rel: serde_json::Value = http
        .get(MOD_RELEASE_API)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let Some(asset) = rel["assets"]
        .as_array()
        .and_then(|a| a.iter().find(|x| x["name"].as_str() == Some("aero-client.jar")))
    else {
        return Ok(false);
    };
    let (Some(url), Some(stamp)) = (
        asset["browser_download_url"].as_str(),
        asset["updated_at"].as_str(),
    ) else {
        return Ok(false);
    };
    let mods_dir = dir.join("mods");
    std::fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;
    let jar = mods_dir.join("aero-client.jar");
    let version_file = mods_dir.join(".aero-client.version");
    if jar.is_file() && std::fs::read_to_string(&version_file).map(|v| v.trim() == stamp).unwrap_or(false) {
        return Ok(true);
    }
    // Go through the Aero server first (it counts the download and redirects to the same release asset),
    // and fall back to GitHub directly if it is unreachable.
    let counted = async {
        let r = http.get(MOD_COUNTED_URL).send().await.ok()?.error_for_status().ok()?;
        r.bytes().await.ok()
    }
    .await;
    let bytes = match counted {
        Some(b) if b.len() >= 10_000 => b,
        _ => http
            .get(url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?
            .bytes()
            .await
            .map_err(|e| e.to_string())?,
    };
    if bytes.len() < 10_000 {
        return Err("Heruntergeladene Mod-Datei ist zu klein".to_string());
    }
    std::fs::write(&jar, &bytes).map_err(|e| e.to_string())?;
    std::fs::write(&version_file, stamp).map_err(|e| e.to_string())?;
    log_line(log_path, &format!("Mod aktualisiert ({} KB) von GitHub", bytes.len() / 1024));
    Ok(true)
}

/// Downloads Sodium from Modrinth into the instance the first time it launches - skipped if a
/// sodium jar (enabled or user-disabled) is already there, so this only ever seeds it once rather
/// than fighting a player who deliberately removed or disabled it. Best-effort: a failed download
/// (offline, Modrinth down, no matching version for this mc_version) just means the instance
/// launches without it rather than failing the whole launch.
async fn ensure_sodium(dir: &Path, instance: &Instance, log_path: &Path) {
    let mods_dir = dir.join("mods");
    let already_present = std::fs::read_dir(&mods_dir)
        .map(|entries| {
            entries
                .flatten()
                .any(|e| e.file_name().to_string_lossy().to_lowercase().contains("sodium"))
        })
        .unwrap_or(false);
    if already_present {
        return;
    }
    log_line(log_path, "Installiere Sodium (Performance)...");
    if let Err(e) = crate::content::install_content("sodium".to_string(), "mod".to_string(), instance.id.clone()).await {
        log_line(log_path, &format!("Sodium-Installation übersprungen: {e}"));
    }
}

/// Seeds performance-friendly video settings on an instance's very first launch - only when
/// options.txt doesn't exist yet, so this never overwrites settings a player has since changed.
fn ensure_optimized_options(dir: &Path) {
    let path = dir.join("options.txt");
    if path.exists() {
        return;
    }
    let defaults = "renderDistance:8\n\
        simulationDistance:8\n\
        particles:2\n\
        graphicsMode:0\n\
        ao:0\n\
        entityShadows:false\n\
        renderClouds:false\n\
        maxFps:260\n\
        enableVsync:false\n\
        bobView:false\n\
        biomeBlendRadius:0\n\
        menuBackgroundBlurriness:0.0\n";
    let _ = std::fs::write(path, defaults);
}
