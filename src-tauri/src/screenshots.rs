//! Screenshots gallery: lists an instance's newest screenshots and hands single ones to the UI.

use base64::Engine;
use serde::Serialize;

use crate::instances;

#[derive(Serialize)]
pub struct Screenshot {
    pub name: String,
    /// Seconds since the Unix epoch.
    pub modified: u64,
}

fn dir(instance_id: &str) -> std::path::PathBuf {
    instances::instance_dir(instance_id).join("screenshots")
}

/// Newest first, at most 60.
#[tauri::command]
pub fn list_screenshots(instance_id: String) -> Vec<Screenshot> {
    let mut out: Vec<Screenshot> = std::fs::read_dir(dir(&instance_id))
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if !name.to_lowercase().ends_with(".png") {
                return None;
            }
            let modified = e.metadata().ok()?.modified().ok()?.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs();
            Some(Screenshot { name, modified })
        })
        .collect();
    out.sort_by(|a, b| b.modified.cmp(&a.modified));
    out.truncate(60);
    out
}

/// One screenshot as a data URL. The name must be a plain file name inside the screenshots folder.
#[tauri::command]
pub fn read_screenshot(instance_id: String, name: String) -> Result<String, String> {
    if name.contains(['/', '\\']) || name.contains("..") || !name.to_lowercase().ends_with(".png") {
        return Err("Ungültiger Dateiname.".to_string());
    }
    let bytes = std::fs::read(dir(&instance_id).join(&name)).map_err(|e| e.to_string())?;
    Ok(format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes)))
}

/// Opens the screenshots folder in the file manager (created if missing).
#[tauri::command]
pub fn screenshots_dir(instance_id: String) -> Result<String, String> {
    let d = dir(&instance_id);
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d.display().to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn rejects_paths_outside_the_folder() {
        for bad in ["../a.png", "a/b.png", "..\\a.png", "a.txt"] {
            assert!(super::read_screenshot("x".into(), bad.into()).is_err(), "{bad}");
        }
    }
}
