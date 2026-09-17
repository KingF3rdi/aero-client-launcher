//! Uploads a local PNG as the active account's Minecraft skin via Mojang's
//! official skins endpoint - the same one the real Minecraft Launcher uses.

use std::path::Path;

use crate::state;

#[tauri::command]
pub async fn upload_skin(path: String, variant: String) -> Result<(), String> {
    let account = state::load_active_account().ok_or("Kein Account angemeldet")?;
    let bytes = std::fs::read(&path).map_err(|e| format!("Datei konnte nicht gelesen werden: {e}"))?;
    let filename = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("skin.png")
        .to_string();

    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(filename)
        .mime_str("image/png")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .text("variant", if variant == "slim" { "slim" } else { "classic" })
        .part("file", part);

    let http = reqwest::Client::builder()
        .user_agent("LarpLauncher/0.1")
        .build()
        .map_err(|e| e.to_string())?;

    let res = http
        .post("https://api.minecraftservices.com/minecraft/profile/skins")
        .bearer_auth(&account.mc_token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Skin-Upload fehlgeschlagen ({status}): {body}"));
    }
    Ok(())
}
