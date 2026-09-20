//! Launcher self-update: on start, compares the newest GitHub release of the launcher repo with this
//! build's version and, if newer, swaps the exe in place (a small script waits for this process to exit).

use std::path::PathBuf;

const RELEASE_API: &str = "https://api.github.com/repos/KingF3rdi/aero-client-launcher/releases/latest";

fn parse(v: &str) -> Vec<u64> {
    v.trim_start_matches(['v', 'V'])
        .split('.')
        .map(|p| p.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0))
        .collect()
}

fn is_newer(remote: &str, local: &str) -> bool {
    let (r, l) = (parse(remote), parse(local));
    for i in 0..r.len().max(l.len()) {
        let (a, b) = (r.get(i).copied().unwrap_or(0), l.get(i).copied().unwrap_or(0));
        if a != b {
            return a > b;
        }
    }
    false
}

async fn try_update() -> Result<bool, String> {
    let http = reqwest::Client::builder()
        .user_agent("AeroClient-Launcher")
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let rel: serde_json::Value = http
        .get(RELEASE_API)
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let tag = rel["tag_name"].as_str().unwrap_or("");
    if !is_newer(tag, env!("CARGO_PKG_VERSION")) {
        return Ok(false);
    }
    let Some(url) = rel["assets"].as_array().and_then(|a| {
        a.iter()
            .find(|x| x["name"].as_str().map(|n| n.to_lowercase().ends_with(".exe")).unwrap_or(false))
            .and_then(|x| x["browser_download_url"].as_str())
    }) else {
        return Ok(false);
    };
    let bytes = http.get(url).send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?
        .bytes().await.map_err(|e| e.to_string())?;
    // A launcher exe is many MB; anything tiny is an error page, never replace ourselves with it.
    if bytes.len() < 1_000_000 || &bytes[..2] != b"MZ" {
        return Err("Update-Datei ist keine gueltige exe".to_string());
    }
    let current: PathBuf = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = current.parent().ok_or("kein Ordner")?.to_path_buf();
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
