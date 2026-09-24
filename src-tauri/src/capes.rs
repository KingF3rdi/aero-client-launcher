//! Community capes: browse/publish against the Aero server, and equip/unequip by writing directly
//! into the selected instance's Fabric mod config (the mod itself is the only thing that ever
//! *reads* that file - this only ever touches the one `equippedCape` field, on the same machine).

use serde::{Deserialize, Serialize};

use crate::instances;
use crate::state::load_active_account;

const API_BASE: &str = "https://aero.gamekni9ht.workers.dev";

#[derive(Serialize, Deserialize, Clone)]
pub struct CapeSummary {
    pub id: i64,
    pub name: String,
    pub owner: String,
    #[serde(rename = "ownerUuid")]
    pub owner_uuid: String,
}

#[tauri::command]
pub async fn list_capes() -> Result<Vec<CapeSummary>, String> {
    let http = reqwest::Client::new();
    let res: serde_json::Value = http
        .get(format!("{API_BASE}/api/capes"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    serde_json::from_value(res["capes"].clone()).map_err(|e| e.to_string())
}

/// Same handshake the Fabric mod does: prove the active account's identity to Mojang's session
/// server with the Minecraft access token this launcher already holds for it, then trade that
/// proof for an Aero server bearer token.
pub(crate) async fn aero_token(http: &reqwest::Client) -> Result<String, String> {
    let account = load_active_account().ok_or("Kein Account angemeldet.")?;
    let start: serde_json::Value = http
        .post(format!("{API_BASE}/api/auth/start"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let server_id = start["serverId"].as_str().ok_or("Ungültige Server-Antwort.")?;

    let join = http
        .post("https://sessionserver.mojang.com/session/minecraft/join")
        .json(&serde_json::json!({
            "accessToken": account.mc_token,
            "selectedProfile": account.uuid.replace('-', ""),
            "serverId": server_id,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !join.status().is_success() {
        return Err("Mojang hat die Sitzung nicht bestätigt (Login abgelaufen?).".to_string());
    }

    let finish: serde_json::Value = http
        .post(format!("{API_BASE}/api/auth/finish"))
        .json(&serde_json::json!({ "name": account.name, "serverId": server_id }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    finish["token"].as_str().map(str::to_string).ok_or_else(|| "Kein Token erhalten.".to_string())
}

fn png_size(bytes: &[u8]) -> Option<(u32, u32)> {
    const SIG: [u8; 8] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if bytes.len() < 24 || bytes[..8] != SIG || &bytes[12..16] != b"IHDR" {
        return None;
    }
    Some((u32::from_be_bytes(bytes[16..20].try_into().unwrap()), u32::from_be_bytes(bytes[20..24].try_into().unwrap())))
}

/// Reads a local PNG, checks it is a valid 64x32 cape, and uploads it as a new community cape.
#[tauri::command]
pub async fn publish_cape(path: String, name: String) -> Result<i64, String> {
    let bytes = std::fs::read(&path).map_err(|_| "Datei konnte nicht gelesen werden.".to_string())?;
    match png_size(&bytes) {
        Some((64, 32)) => {}
        Some((w, h)) => return Err(format!("Cape muss 64x32 Pixel groß sein (diese Datei ist {w}x{h}).")),
        None => return Err("Das ist keine PNG-Datei.".to_string()),
    }
    if bytes.len() > 8192 {
        return Err("Datei ist zu groß (max. 8 KB).".to_string());
    }

    let http = reqwest::Client::new();
    let token = aero_token(&http).await?;
    let clean_name: String = name.chars().filter(|c| !c.is_control()).take(24).collect();
    let mut upload_url = url::Url::parse(&format!("{API_BASE}/api/capes")).map_err(|e| e.to_string())?;
    upload_url.query_pairs_mut().append_pair("name", if clean_name.trim().is_empty() { "Cape" } else { &clean_name });

    let res = http
        .post(upload_url)
        .header("authorization", format!("Bearer {token}"))
        .header("content-type", "image/png")
        .body(bytes)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let body: serde_json::Value = res.json().await.unwrap_or(serde_json::Value::Null);
    body["id"].as_i64().ok_or_else(|| body["error"].as_str().unwrap_or("Server hat den Upload abgelehnt.").to_string())
}

/// Deletes one of the active account's own published capes (the server checks ownership itself).
#[tauri::command]
pub async fn delete_cape(cape_id: i64) -> Result<(), String> {
    let http = reqwest::Client::new();
    let token = aero_token(&http).await?;
    http.delete(format!("{API_BASE}/api/capes/{cape_id}"))
        .header("authorization", format!("Bearer {token}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn mod_config_path(instance_id: &str) -> std::path::PathBuf {
    instances::instance_dir(instance_id).join("config").join("aero-client.json")
}

pub(crate) fn read_mod_config(instance_id: &str) -> serde_json::Value {
    std::fs::read_to_string(mod_config_path(instance_id))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}))
}

/// The cape id ("none" or e.g. "custom_17") this instance's mod config currently has equipped.
#[tauri::command]
pub fn equipped_cape(instance_id: String) -> String {
    read_mod_config(&instance_id)["equippedCape"].as_str().unwrap_or("none").to_string()
}

/// Sets the equipped cape for the next time this instance's mod starts. If the game is currently
/// running with this instance, its own save (e.g. any settings change) will overwrite this - it
/// only reliably takes effect while the instance isn't running.
#[tauri::command]
pub fn equip_cape(instance_id: String, cape_id: Option<String>) -> Result<(), String> {
    let path = mod_config_path(&instance_id);
    std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let mut config = read_mod_config(&instance_id);
    config["equippedCape"] = serde_json::Value::String(cape_id.unwrap_or_else(|| "none".to_string()));
    std::fs::write(&path, serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}
