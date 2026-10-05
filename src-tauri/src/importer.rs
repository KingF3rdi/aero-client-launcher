//! One-click import of Fabric instances other launchers already have on disk: Prism Launcher, the Modrinth
//! App, CurseForge and the official launcher. Copies mods, configs, resource/shader packs, options and the
//! server list into a new Aero instance (not worlds, which can be gigabytes, and not account files).

use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::instances::{add_instance, copy_dir_recursive, instance_dir, Instance};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ForeignInstance {
    pub source: String,
    pub name: String,
    /// None = could not tell (the UI asks for one)
    pub mc_version: Option<String>,
    /// the game folder (where mods/ and config/ live)
    pub path: String,
    pub mods: usize,
}

const COPY_DIRS: &[&str] = &["mods", "config", "resourcepacks", "shaderpacks"];
const COPY_FILES: &[&str] = &["options.txt", "servers.dat"];

fn count_mods(game: &Path) -> usize {
    std::fs::read_dir(game.join("mods"))
        .map(|d| d.flatten().filter(|e| e.file_name().to_string_lossy().ends_with(".jar")).count())
        .unwrap_or(0)
}

/// "Loading Minecraft 1.21.11 with Fabric Loader ..." from the last run's log, else a version in the name.
fn guess_version(game: &Path, name: &str) -> Option<String> {
    if let Ok(log) = std::fs::read_to_string(game.join("logs").join("latest.log")) {
        if let Some(rest) = log.split("Loading Minecraft ").nth(1) {
            if let Some(v) = rest.split_whitespace().next() {
                return Some(v.to_string());
            }
        }
    }
    name.split(|c: char| !(c.is_ascii_digit() || c == '.'))
        .find(|t| t.starts_with("1.") && t.matches('.').count() >= 1 && !t.ends_with('.'))
        .map(|t| t.to_string())
}

fn entry(source: &str, name: String, version: Option<String>, game: PathBuf) -> Option<ForeignInstance> {
    if !game.join("mods").is_dir() {
        return None;
    }
    Some(ForeignInstance {
        source: source.into(),
        mc_version: version.or_else(|| guess_version(&game, &name)),
        name,
        mods: count_mods(&game),
        path: game.to_string_lossy().to_string(),
    })
}

fn subdirs(dir: &Path) -> Vec<PathBuf> {
    std::fs::read_dir(dir)
        .map(|d| d.flatten().map(|e| e.path()).filter(|p| p.is_dir()).collect())
        .unwrap_or_default()
}

fn prism(roaming: &Path, out: &mut Vec<ForeignInstance>) {
    for (label, folder) in [("Prism Launcher", "PrismLauncher"), ("PolyMC", "PolyMC")] {
        for inst in subdirs(&roaming.join(folder).join("instances")) {
            let cfg = std::fs::read_to_string(inst.join("instance.cfg")).unwrap_or_default();
            let name = cfg
                .lines()
                .find_map(|l| l.strip_prefix("name="))
                .map(str::to_string)
                .unwrap_or_else(|| inst.file_name().unwrap_or_default().to_string_lossy().to_string());
            let pack: serde_json::Value = std::fs::read_to_string(inst.join("mmc-pack.json"))
                .ok()
                .and_then(|t| serde_json::from_str(&t).ok())
                .unwrap_or_default();
            let comps = pack["components"].as_array().cloned().unwrap_or_default();
            if !comps.iter().any(|c| c["uid"] == "net.fabricmc.fabric-loader") {
                continue;
            }
            let version = comps.iter().find(|c| c["uid"] == "net.minecraft").and_then(|c| c["version"].as_str()).map(str::to_string);
            let game = if inst.join("minecraft").is_dir() { inst.join("minecraft") } else { inst.join(".minecraft") };
            out.extend(entry(label, name, version, game));
        }
    }
}

fn modrinth(roaming: &Path, out: &mut Vec<ForeignInstance>) {
    for folder in ["ModrinthApp", "com.modrinth.theseus"] {
        for game in subdirs(&roaming.join(folder).join("profiles")) {
            if !game.join(".fabric").is_dir() {
                continue; // not a Fabric profile
            }
            let name = game.file_name().unwrap_or_default().to_string_lossy().to_string();
            out.extend(entry("Modrinth App", name, None, game));
        }
    }
}

fn curseforge(home: &Path, out: &mut Vec<ForeignInstance>) {
    for inst in subdirs(&home.join("curseforge").join("minecraft").join("Instances")) {
        let Some(meta) = std::fs::read_to_string(inst.join("minecraftinstance.json"))
            .ok()
            .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        else {
            continue;
        };
        if !meta["baseModLoader"]["name"].as_str().unwrap_or("").starts_with("fabric") {
            continue;
        }
        let name = meta["name"].as_str().map(str::to_string).unwrap_or_else(|| inst.file_name().unwrap_or_default().to_string_lossy().to_string());
        let version = meta["gameVersion"].as_str().map(str::to_string);
        out.extend(entry("CurseForge", name, version, inst));
    }
}

fn official(roaming: &Path, out: &mut Vec<ForeignInstance>) {
    let mc = roaming.join(".minecraft");
    let Some(profiles) = std::fs::read_to_string(mc.join("launcher_profiles.json"))
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
    else {
        return;
    };
    let mut list = profiles["profiles"].as_object().map(|o| o.values().cloned().collect::<Vec<_>>()).unwrap_or_default();
    // profiles often share one game folder: keep the most recently used one per folder
    list.sort_by(|a, b| b["lastUsed"].as_str().unwrap_or("").cmp(a["lastUsed"].as_str().unwrap_or("")));
    for p in list {
        let last = p["lastVersionId"].as_str().unwrap_or("");
        if !last.starts_with("fabric-loader-") {
            continue;
        }
        let version = last.rsplit('-').next().map(str::to_string);
        let game = p["gameDir"].as_str().map(PathBuf::from).unwrap_or_else(|| mc.clone());
        let name = p["name"].as_str().filter(|n| !n.is_empty()).unwrap_or(last).to_string();
        if out.iter().any(|f| Path::new(&f.path) == game) {
            continue;
        }
        out.extend(entry("Minecraft Launcher", name, version, game));
    }
}

fn find_all() -> Vec<ForeignInstance> {
    let mut out = Vec::new();
    if let Some(roaming) = dirs::config_dir() {
        prism(&roaming, &mut out);
        modrinth(&roaming, &mut out);
        official(&roaming, &mut out);
    }
    if let Some(home) = dirs::home_dir() {
        curseforge(&home, &mut out);
    }
    out
}

#[tauri::command]
pub fn find_foreign_instances() -> Vec<ForeignInstance> {
    find_all()
}

#[tauri::command]
pub fn import_foreign_instance(path: String, name: String, mc_version: String) -> Result<Instance, String> {
    // only folders the scan found, never an arbitrary path from the UI
    let found = find_all().into_iter().find(|f| f.path == path).ok_or("Diese Instanz wurde nicht gefunden")?;
    let instance = add_instance(name, mc_version)?;
    let src = PathBuf::from(&found.path);
    let dst = instance_dir(&instance.id);
    for d in COPY_DIRS {
        if src.join(d).is_dir() {
            copy_dir_recursive(&src.join(d), &dst.join(d)).map_err(|e| format!("{d} konnte nicht kopiert werden: {e}"))?;
        }
    }
    for f in COPY_FILES {
        if src.join(f).is_file() {
            let _ = std::fs::copy(src.join(f), dst.join(f));
        }
    }
    Ok(instance)
}

#[cfg(test)]
mod tests {
    use super::guess_version;
    use std::path::Path;

    #[test]
    fn version_from_name() {
        let none = Path::new("does-not-exist");
        assert_eq!(guess_version(none, "Fabric 1.21.11 (1)").as_deref(), Some("1.21.11"));
        assert_eq!(guess_version(none, "PvP 1.21").as_deref(), Some("1.21"));
        assert_eq!(guess_version(none, "My Pack").as_deref(), None);
    }
}
