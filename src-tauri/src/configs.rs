//! Mod config files (instance/config/**) as text, so they can be edited in the launcher.

use std::path::{Path, PathBuf};

use crate::instances::instance_dir;

const TEXT_EXT: &[&str] = &["json", "json5", "jsonc", "toml", "properties", "cfg", "conf", "txt", "yml", "yaml", "ini"];
const MAX_BYTES: u64 = 1024 * 1024;

fn config_root(id: &str) -> PathBuf {
    instance_dir(id).join("config")
}

/// Only text files below config/, never outside it.
fn safe(id: &str, rel: &str) -> Result<PathBuf, String> {
    if rel.contains("..") || rel.starts_with('/') || rel.starts_with('\\') || rel.contains(':') {
        return Err("Ungültiger Pfad".into());
    }
    let ext = Path::new(rel).extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if !TEXT_EXT.contains(&ext.as_str()) {
        return Err("Kein Text-Config".into());
    }
    Ok(config_root(id).join(rel))
}

fn walk(root: &Path, dir: &Path, out: &mut Vec<String>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for e in entries.flatten() {
        let p = e.path();
        if p.is_dir() {
            walk(root, &p, out);
        } else if e.metadata().map(|m| m.len() <= MAX_BYTES).unwrap_or(false) {
            let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
            if TEXT_EXT.contains(&ext.as_str()) {
                if let Ok(rel) = p.strip_prefix(root) {
                    out.push(rel.to_string_lossy().replace('\\', "/"));
                }
            }
        }
    }
}

#[tauri::command]
pub fn list_config_files(id: String) -> Vec<String> {
    let root = config_root(&id);
    let mut out = Vec::new();
    walk(&root, &root, &mut out);
    out.sort_by_key(|s| s.to_lowercase());
    out
}

#[tauri::command]
pub fn read_config_file(id: String, rel: String) -> Result<String, String> {
    std::fs::read_to_string(safe(&id, &rel)?).map_err(|e| format!("Konnte nicht gelesen werden: {e}"))
}

#[tauri::command]
pub fn write_config_file(id: String, rel: String, text: String) -> Result<(), String> {
    let path = safe(&id, &rel)?;
    if !path.is_file() {
        return Err("Datei nicht gefunden".into());
    }
    std::fs::write(path, text).map_err(|e| format!("Konnte nicht gespeichert werden: {e}"))
}
