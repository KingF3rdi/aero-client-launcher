//! Minecraft username check and change through Mojang's profile API - the same endpoints
//! minecraft.net uses. The UI asks twice before change_name, since a change locks the name for 30 days.

use crate::state;

fn http() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("AeroClient/0.1")
        .build()
        .map_err(|e| e.to_string())
}

fn valid(name: &str) -> bool {
    (3..=16).contains(&name.len()) && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn token() -> Result<String, String> {
    Ok(state::load_active_account().ok_or("Kein Account angemeldet")?.mc_token)
}

/// "free", "taken" or "invalid".
#[tauri::command]
pub async fn check_name(name: String) -> Result<String, String> {
    if !valid(&name) {
        return Ok("invalid".into());
    }
    let res = http()?
        .get(format!("https://api.minecraftservices.com/minecraft/profile/name/{name}/available"))
        .bearer_auth(token()?)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Prüfung fehlgeschlagen ({})", res.status()));
    }
    let v: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(match v["status"].as_str() {
        Some("AVAILABLE") => "free",
        Some("DUPLICATE") => "taken",
        _ => "invalid",
    }
    .into())
}

/// None = the name can be changed now, else the date of the last change (the next one is 30 days later).
#[tauri::command]
pub async fn name_change_lock() -> Result<Option<String>, String> {
    let v: serde_json::Value = http()?
        .get("https://api.minecraftservices.com/minecraft/profile/namechange")
        .bearer_auth(token()?)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    if v["nameChangeAllowed"].as_bool().unwrap_or(true) {
        return Ok(None);
    }
    Ok(Some(v["changedAt"].as_str().unwrap_or_default().to_string()))
}

#[tauri::command]
pub async fn change_name(name: String) -> Result<(), String> {
    if !valid(&name) {
        return Err("3 bis 16 Zeichen: Buchstaben, Zahlen und _".into());
    }
    let res = http()?
        .put(format!("https://api.minecraftservices.com/minecraft/profile/name/{name}"))
        .bearer_auth(token()?)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    match res.status().as_u16() {
        200 => Ok(()),
        400 => Err("Dieser Name ist nicht erlaubt.".into()),
        401 => Err("Sitzung abgelaufen. Melde dich neu an.".into()),
        403 => Err("Der Name ist vergeben oder du hast ihn in den letzten 30 Tagen schon geändert.".into()),
        429 => Err("Zu viele Versuche. Warte kurz.".into()),
        s => Err(format!("Namensänderung fehlgeschlagen ({s}): {}", res.text().await.unwrap_or_default())),
    }
}
