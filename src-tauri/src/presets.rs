//! Shared config presets: publish the selected instance's whole aero-client.json to the Aero
//! server so other players can browse and apply it - same publish/list/delete shape as capes.rs,
//! but for the mod's settings file instead of a cape PNG. `apiBase` is stripped before applying a
//! preset so a shared preset can never repoint the mod's networking at another server.

use serde::{Deserialize, Serialize};

use crate::capes::{aero_token, mod_config_path, read_mod_config};

const API_BASE: &str = "https://aero.gamekni9ht.workers.dev";

#[derive(Serialize, Deserialize, Clone)]
pub struct PresetSummary {
    pub id: i64,
    pub name: String,
    pub owner: String,
    #[serde(rename = "ownerUuid")]
    pub owner_uuid: String,
}

#[tauri::command]
pub async fn list_presets() -> Result<Vec<PresetSummary>, String> {
    let http = reqwest::Client::new();
    let res: serde_json::Value = http
        .get(format!("{API_BASE}/api/presets"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    serde_json::from_value(res["presets"].clone()).map_err(|e| e.to_string())
}

/// Uploads the selected instance's current mod config as a new named preset.
#[tauri::command]
pub async fn publish_preset(instance_id: String, name: String) -> Result<i64, String> {
    let config = read_mod_config(&instance_id);
    if config.as_object().is_none_or(|o| o.is_empty()) {
        return Err("Dieses Profil hat noch keine Aero-Konfiguration (einmal starten und beenden).".to_string());
    }
    let body = serde_json::to_vec(&config).map_err(|e| e.to_string())?;

    let http = reqwest::Client::new();
    let token = aero_token(&http).await?;
    let clean_name: String = name.chars().filter(|c| !c.is_control()).take(24).collect();
    let mut upload_url = url::Url::parse(&format!("{API_BASE}/api/presets")).map_err(|e| e.to_string())?;
    upload_url.query_pairs_mut().append_pair("name", if clean_name.trim().is_empty() { "Preset" } else { &clean_name });

    let res = http
        .post(upload_url)
        .header("authorization", format!("Bearer {token}"))
        .header("content-type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let out: serde_json::Value = res.json().await.unwrap_or(serde_json::Value::Null);
    out["id"].as_i64().ok_or_else(|| out["error"].as_str().unwrap_or("Server hat den Upload abgelehnt.").to_string())
}

/// Deletes one of the active account's own published presets (the server checks ownership itself).
#[tauri::command]
pub async fn delete_preset(preset_id: i64) -> Result<(), String> {
    let http = reqwest::Client::new();
    let token = aero_token(&http).await?;
    http.delete(format!("{API_BASE}/api/presets/{preset_id}"))
        .header("authorization", format!("Bearer {token}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Downloads a preset and merges its fields into the instance's mod config - keeps any local field
/// the preset doesn't mention, and always keeps the local `apiBase` regardless of what the preset
/// says. Only reliably takes effect while the instance isn't currently running.
#[tauri::command]
pub async fn apply_preset(instance_id: String, preset_id: i64) -> Result<(), String> {
    let http = reqwest::Client::new();
    let mut preset: serde_json::Value = http
        .get(format!("{API_BASE}/api/presets/{preset_id}.json"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    if let Some(obj) = preset.as_object_mut() {
        obj.remove("apiBase");
    }

    let path = mod_config_path(&instance_id);
    std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let mut config = read_mod_config(&instance_id);
    if let (Some(dst), Some(src)) = (config.as_object_mut(), preset.as_object()) {
        for (k, v) in src {
            dst.insert(k.clone(), v.clone());
        }
    }
    std::fs::write(&path, serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}
