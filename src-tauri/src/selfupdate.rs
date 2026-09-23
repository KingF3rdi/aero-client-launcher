//! Launcher self-update. The release repo is shared with the mod (tags follow the mod's version), so the
//! launcher doesn't compare tags: it takes the newest stable .exe asset across recent releases and compares
//! that asset's id with the one it last installed (stamp file next to the exe). A newer asset is swapped in
//! place; a small script waits for this process to exit.

use std::path::PathBuf;

const RELEASES_API: &str = "https://api.github.com/repos/KingF3rdi/aero-client-launcher/releases?per_page=30";
const STAMP: &str = ".aero-launcher.version";

/// (asset id, download url) of the most recently uploaded launcher exe in a stable (non-prerelease) release.
fn newest_exe(releases: &serde_json::Value) -> Option<(u64, String)> {
    releases
        .as_array()?
        .iter()
        .filter(|r| !r["draft"].as_bool().unwrap_or(false) && !r["prerelease"].as_bool().unwrap_or(false))
        .flat_map(|r| r["assets"].as_array().cloned().unwrap_or_default())
        .filter(|a| a["name"].as_str().map(|n| n.to_lowercase().ends_with(".exe")).unwrap_or(false))
        .max_by(|a, b| a["updated_at"].as_str().unwrap_or("").cmp(b["updated_at"].as_str().unwrap_or("")))
        .and_then(|a| Some((a["id"].as_u64()?, a["browser_download_url"].as_str()?.to_string())))
}

async fn try_update() -> Result<bool, String> {
    let http = reqwest::Client::builder()
        .user_agent("AeroClient-Launcher")
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let releases: serde_json::Value = http
        .get(RELEASES_API)
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let Some((asset_id, url)) = newest_exe(&releases) else {
        return Ok(false);
    };
    let current: PathBuf = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = current.parent().ok_or("kein Ordner")?.to_path_buf();
    let stamp = dir.join(STAMP);
    match std::fs::read_to_string(&stamp) {
        Ok(s) if s.trim() == asset_id.to_string() => return Ok(false),
        // No stamp yet: a freshly downloaded launcher is the current release, so just remember it.
        Err(_) => {
            let _ = std::fs::write(&stamp, asset_id.to_string());
            return Ok(false);
        }
        Ok(_) => {}
    }
    let bytes = http.get(&url).send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .bytes().await.map_err(|e| e.to_string())?;
    // A launcher exe is many MB; anything tiny is an error page, never replace ourselves with it.
    if bytes.len() < 1_000_000 || &bytes[..2] != b"MZ" {
        return Err("Update-Datei ist keine gueltige exe".to_string());
    }
    std::fs::write(&stamp, asset_id.to_string()).map_err(|e| e.to_string())?;
    let new_exe = dir.join("Aero Client.update.exe");
    std::fs::write(&new_exe, &bytes).map_err(|e| e.to_string())?;
    let script = dir.join("aero-update.cmd");
    let body = format!(
        "@echo off\r\n:retry\r\nping 127.0.0.1 -n 2 >nul\r\nmove /y \"{new}\" \"{cur}\" >nul 2>&1 || goto retry\r\nstart \"\" \"{cur}\"\r\ndel \"%~f0\"\r\n",
        new = new_exe.display(),
        cur = current.display()
    );
    std::fs::write(&script, body).map_err(|e| e.to_string())?;
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(["/C", &script.display().to_string()])
            .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(true)
}

/// Runs in the background at startup; exits the app when an update was staged.
pub async fn check(app: tauri::AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }
    if let Ok(true) = try_update().await {
        app.exit(0);
    }
}

#[cfg(test)]
mod tests {
    use super::newest_exe;

    #[test]
    fn picks_newest_stable_exe_across_releases() {
        let rels = serde_json::json!([
            {"draft": false, "prerelease": false, "assets": [{"id": 1, "name": "aero-client.jar", "updated_at": "2026-09-23", "browser_download_url": "j"}]},
            {"draft": false, "prerelease": true, "assets": [{"id": 2, "name": "Aero-Client.exe", "updated_at": "2026-09-24", "browser_download_url": "beta"}]},
            {"draft": false, "prerelease": false, "assets": [{"id": 3, "name": "Aero-Client.exe", "updated_at": "2026-09-22", "browser_download_url": "new"}]},
            {"draft": false, "prerelease": false, "assets": [{"id": 4, "name": "Aero-Client.exe", "updated_at": "2026-09-01", "browser_download_url": "old"}]}
        ]);
        assert_eq!(newest_exe(&rels), Some((3, "new".to_string())));
        assert_eq!(newest_exe(&serde_json::json!([])), None);
    }
}
