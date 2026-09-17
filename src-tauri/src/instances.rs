use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::state::{data_dir, game_dir};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Instance {
    pub id: String,
    pub name: String,
    pub mc_version: String,
    pub loader: String,
    /// Whether the Larp Client Fabric mod jar gets copied into this instance's
    /// mods folder on launch. Defaults on only for versions the mod actually
    /// targets, so a fresh instance doesn't silently try to load a mismatched jar.
    #[serde(default)]
    pub mod_enabled: bool,
    /// Per-instance RAM override; falls back to the launcher-wide slider when unset.
    #[serde(default)]
    pub ram_gb: Option<u32>,
}

fn instances_file() -> PathBuf {
    data_dir().join("instances.json")
}

/// Same version list as the Python prototype's runtime.py INSTANCES, so
/// switching launchers doesn't change what's offered to players.
fn default_instances() -> Vec<Instance> {
    let versions = [
        ("fabric-1.21.11", "Fabric 1.21.11", "1.21.11"),
        ("fabric-1.21.8", "Fabric 1.21.8", "1.21.8"),
        ("fabric-1.21.4", "Fabric 1.21.4", "1.21.4"),
        ("fabric-1.21.1", "Fabric 1.21.1", "1.21.1"),
        ("fabric-1.21", "Fabric 1.21", "1.21"),
    ];
    versions
        .into_iter()
        .map(|(id, name, mc_version)| Instance {
            id: id.to_string(),
            name: name.to_string(),
            mc_version: mc_version.to_string(),
            loader: "fabric".to_string(),
            // The mod jar is only ever built for 1.21.11 today - see ensure_mod_jar in launch.rs.
            mod_enabled: mc_version == "1.21.11",
            ram_gb: None,
        })
        .collect()
}

pub fn load_instances() -> Vec<Instance> {
    match std::fs::read_to_string(instances_file()) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|_| default_instances()),
        Err(_) => {
            let seeded = default_instances();
            let _ = save_instances(&seeded);
            seeded
        }
    }
}

pub fn save_instances(instances: &[Instance]) -> Result<(), String> {
    std::fs::create_dir_all(data_dir()).map_err(|e| e.to_string())?;
    let text = serde_json::to_string_pretty(instances).map_err(|e| e.to_string())?;
    std::fs::write(instances_file(), text).map_err(|e| e.to_string())
}

/// Each instance gets its own game directory (mods/worlds/configs/logs all
/// isolated) instead of every instance sharing one folder like earlier builds did -
/// needed for per-instance mod toggling and log viewing to mean anything.
pub fn instance_dir(id: &str) -> PathBuf {
    game_dir().join("instances").join(id)
}

pub fn find(id: &str) -> Option<Instance> {
    load_instances().into_iter().find(|i| i.id == id)
}

#[tauri::command]
pub fn get_instances() -> Vec<Instance> {
    load_instances()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstancePatch {
    pub name: Option<String>,
    pub mod_enabled: Option<bool>,
    pub ram_gb: Option<Option<u32>>,
}

#[tauri::command]
pub fn update_instance(id: String, patch: InstancePatch) -> Result<Instance, String> {
    let mut instances = load_instances();
    let instance = instances
        .iter_mut()
        .find(|i| i.id == id)
        .ok_or("Unbekannte Instanz")?;
    if let Some(name) = patch.name {
        if !name.trim().is_empty() {
            instance.name = name.trim().to_string();
        }
    }
    if let Some(mod_enabled) = patch.mod_enabled {
        instance.mod_enabled = mod_enabled;
    }
    if let Some(ram_gb) = patch.ram_gb {
        instance.ram_gb = ram_gb;
    }
    let updated = instance.clone();
    save_instances(&instances)?;
    Ok(updated)
}

#[tauri::command]
pub fn delete_instance(id: String) -> Result<(), String> {
    let mut instances = load_instances();
    let before = instances.len();
    instances.retain(|i| i.id != id);
    if instances.len() == before {
        return Err("Unbekannte Instanz".into());
    }
    save_instances(&instances)?;
    // Best-effort: the instance's own files aren't needed once it's gone, but a
    // failure here shouldn't undo the (already-saved) removal from the list.
    let _ = std::fs::remove_dir_all(instance_dir(&id));
    Ok(())
}

#[tauri::command]
pub fn duplicate_instance(id: String) -> Result<Instance, String> {
    let mut instances = load_instances();
    let source = instances.iter().find(|i| i.id == id).ok_or("Unbekannte Instanz")?.clone();
    let new_id = format!("{}-copy-{}", source.id, short_random_suffix());
    let copy = Instance {
        id: new_id.clone(),
        name: format!("{} (Kopie)", source.name),
        mc_version: source.mc_version.clone(),
        loader: source.loader.clone(),
        mod_enabled: source.mod_enabled,
        ram_gb: source.ram_gb,
    };
    if instance_dir(&source.id).is_dir() {
        copy_dir_recursive(&instance_dir(&source.id), &instance_dir(&new_id)).map_err(|e| e.to_string())?;
    }
    instances.push(copy.clone());
    save_instances(&instances)?;
    Ok(copy)
}

#[tauri::command]
pub fn add_instance(name: String, mc_version: String) -> Result<Instance, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Name darf nicht leer sein".into());
    }
    let mc_version = mc_version.trim();
    if mc_version.is_empty() {
        return Err("Minecraft-Version darf nicht leer sein".into());
    }
    let mut instances = load_instances();
    let id = format!("fabric-{mc_version}-{}", short_random_suffix());
    let instance = Instance {
        id,
        name: name.to_string(),
        mc_version: mc_version.to_string(),
        loader: "fabric".to_string(),
        mod_enabled: mc_version == "1.21.11",
        ram_gb: None,
    };
    instances.push(instance.clone());
    save_instances(&instances)?;
    Ok(instance)
}

#[tauri::command]
pub fn get_instance_log(id: String) -> Result<String, String> {
    let path = instance_dir(&id).join("logs").join("latest.log");
    std::fs::read_to_string(&path).map_err(|_| "Noch keine Logs für diese Instanz.".to_string())
}

fn short_random_suffix() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.subsec_nanos()).unwrap_or(0);
    format!("{:x}", nanos & 0xFFFFF)
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let dest_path = dst.join(entry.file_name());
        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else {
            std::fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}
