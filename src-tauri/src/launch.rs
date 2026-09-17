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

use std::path::{Path, PathBuf};
use std::process::Stdio;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Windows CREATE_NO_WINDOW: java.exe is a console-subsystem program, so
/// without this Windows pops up a blank console window for it every launch
/// (stdout/stderr are already redirected to launcher.log, so nothing would
/// show in it anyway - it'd just flash on screen and worry people).
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("AeroClient/0.1")
        .build()
        .expect("failed to build http client")
}

#[tauri::command]
pub async fn launch_instance(
    instance_id: String,
    ram_gb: u32,
    account: LaunchAccount,
) -> Result<(), String> {
    let instance = instances::find(&instance_id).ok_or("Unbekannte Instanz")?;
    let dir = instances::instance_dir(&instance.id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let effective_ram_gb = instance.ram_gb.unwrap_or(ram_gb);

    let java = find_java().ok_or("Java wurde nicht gefunden. Bitte JDK 21+ installieren.")?;

    let http = client();
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
    let client_jar = dir
        .join("versions")
        .join(&instance.mc_version)
        .join(format!("{}.jar", instance.mc_version));
    if let Some(url) = version_json["downloads"]["client"]["url"].as_str() {
        download_if_missing(&http, url, &client_jar).await?;
    }
    classpath.push(client_jar);

    // Vanilla libraries
    if let Some(libs) = version_json["libraries"].as_array() {
        download_libraries(&http, &dir, libs, &mut classpath).await?;
    }

    // Assets (asset index + objects) - not on the classpath, just needs to be
    // on disk before launch so the client can find sounds/textures/language files.
    if let Some(asset_index_url) = version_json["assetIndex"]["url"].as_str() {
        let asset_index_id = version_json["assetIndex"]["id"].as_str().unwrap_or("legacy");
        download_assets(&http, &dir, asset_index_url, asset_index_id).await?;
    }
    let assets_dir = dir.join("assets");
    let asset_index_id = version_json["assetIndex"]["id"].as_str().unwrap_or("legacy").to_string();

    let mut main_class = version_json["mainClass"]
        .as_str()
        .unwrap_or("net.minecraft.client.main.Main")
        .to_string();

    if instance.loader == "fabric" {
        main_class = install_fabric(&http, &dir, &instance.mc_version, &mut classpath).await?;
    }

    ensure_mod_jar(&dir, &instance)?;

    let natives_placeholder = dir.join("versions").join(&instance.mc_version).join("natives");
    std::fs::create_dir_all(&natives_placeholder).map_err(|e| e.to_string())?;

    let cp = std::env::join_paths(classpath.iter()).map_err(|e| e.to_string())?;

    // A GUI app has no console for the child to inherit, so without this any
    // early JVM failure (bad classpath, missing class, native-library error)
    // vanishes silently instead of reaching the Logs tab - capture it so a
    // launch that never gets as far as Minecraft's own logs/latest.log is
    // still diagnosable.
    let launcher_log = std::fs::File::create(dir.join("launcher.log")).map_err(|e| e.to_string())?;
    let launcher_log_err = launcher_log.try_clone().map_err(|e| e.to_string())?;

    let mut cmd = std::process::Command::new(&java);
    cmd.current_dir(&dir)
        .arg(format!("-Xmx{effective_ram_gb}G"))
        .arg(format!("-Xms{}G", (effective_ram_gb / 2).max(1)))
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
        .stderr(Stdio::from(launcher_log_err));
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.spawn().map_err(|e| format!("Minecraft konnte nicht gestartet werden: {e}"))?;
    Ok(())
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
fn ensure_mod_jar(dir: &Path, instance: &Instance) -> Result<(), String> {
    if !instance.mod_enabled || instance.mc_version != "1.21.11" {
        return Ok(());
    }
    // The dev-relative path only resolves when run via `tauri dev`/`cargo run`
    // from the project checkout - an installed exe's cwd has nothing to do
    // with the source tree, so it silently found nothing and never copied
    // the mod. Also check next to the exe itself, so dropping the jar there
    // (however it gets there - manually, or a future packaging step) works
    // for the real installed app too.
    let dev_relative = PathBuf::from("../liteclient/build/libs/larp-launcher-1.21-1.0.0.jar");
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
