//! Microsoft login (authorization code + PKCE, in a native app window) ->
//! Xbox Live -> XSTS -> Minecraft profile.
//!
//! Opens Microsoft's real sign-in page directly in its own Tauri window
//! (same idea as the official launcher's embedded login popup) instead of
//! the system browser - navigation to the redirect URI is intercepted
//! in-window, so no local HTTP listener or custom URL scheme is needed.
//! Nicer than the earlier device-code flow: no code to retype elsewhere.

use serde::Serialize;
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::state::{self, StoredAccount};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSummary {
    pub name: String,
    pub uuid: String,
    pub active: bool,
}

// Registered under this launcher's own Azure app (Microsoft killed the old
// shared/hardcoded client ID other unofficial launchers relied on - see
// portal.azure.com App registrations, "Personal Microsoft accounts only",
// with a "Mobile and desktop applications" platform redirect of
// "http://localhost").
const CLIENT_ID: &str = "93dc5f4d-de19-4dff-b7d8-1a3739dce372";
const SCOPE: &str = "XboxLive.signin offline_access";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub name: String,
    pub uuid: String,
    pub mc_token: String,
    pub skin_url: Option<String>,
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("AeroClient/0.1")
        .build()
        .expect("failed to build http client")
}

fn random_url_safe(len: usize) -> String {
    let mut bytes = vec![0u8; len];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

/// Opens Microsoft's real sign-in page in its own app window and waits for
/// it to navigate to the redirect URI, catching that navigation in-window
/// instead of letting it actually load (nothing needs to be listening there).
#[tauri::command]
pub async fn login_with_browser(app: tauri::AppHandle) -> Result<Account, String> {
    let redirect_uri = "http://localhost";

    let verifier = random_url_safe(64);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let csrf_state = random_url_safe(16);

    let mut authorize_url = url::Url::parse("https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize")
        .map_err(|e| e.to_string())?;
    authorize_url
        .query_pairs_mut()
        .append_pair("client_id", CLIENT_ID)
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("response_mode", "query")
        .append_pair("scope", SCOPE)
        .append_pair("state", &csrf_state)
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256");

    let (tx, rx) = tokio::sync::oneshot::channel::<Result<HashMap<String, String>, String>>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    let tx_nav = tx.clone();
    let window = tauri::WebviewWindowBuilder::new(&app, "ms-login", tauri::WebviewUrl::External(authorize_url))
        .title("Mit Microsoft anmelden")
        .inner_size(480.0, 720.0)
        .resizable(false)
        .center()
        .on_navigation(move |url| {
            if url.as_str().starts_with(redirect_uri) {
                if let Some(sender) = tx_nav.lock().unwrap().take() {
                    let _ = sender.send(Ok(url.query_pairs().into_owned().collect()));
                }
                false
            } else {
                true
            }
        })
        .build()
        .map_err(|e| e.to_string())?;

    let tx_close = tx.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { .. } = event {
            if let Some(sender) = tx_close.lock().unwrap().take() {
                let _ = sender.send(Err("Anmeldung abgebrochen.".to_string()));
            }
        }
    });

    let params = tokio::time::timeout(Duration::from_secs(300), rx)
        .await
        .map_err(|_| "Login-Zeitlimit überschritten - bitte erneut versuchen.".to_string())?
        .map_err(|_| "Anmeldung abgebrochen.".to_string())??;

    let _ = window.close();

    if params.get("state").map(String::as_str) != Some(csrf_state.as_str()) {
        return Err("Ungültige Anmeldeantwort (state mismatch).".to_string());
    }
    if let Some(err) = params.get("error") {
        return Err(params.get("error_description").cloned().unwrap_or_else(|| err.clone()));
    }
    let code = params.get("code").ok_or("Kein Code von Microsoft erhalten.")?;

    let res: serde_json::Value = client()
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
        .form(&[
            ("client_id", CLIENT_ID),
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            ("redirect_uri", redirect_uri),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let ms_access = res["access_token"].as_str().ok_or("Kein Access Token erhalten.")?;
    let ms_refresh = res["refresh_token"].as_str().unwrap_or_default();

    finish_login(ms_access, ms_refresh).await
}

async fn finish_login(ms_access: &str, ms_refresh: &str) -> Result<Account, String> {
    let account = login_with_ms(ms_access).await?;
    state::upsert_account(&StoredAccount {
        name: account.name.clone(),
        uuid: account.uuid.clone(),
        mc_token: account.mc_token.clone(),
        ms_refresh: ms_refresh.to_string(),
        skin_url: account.skin_url.clone(),
    })
    .map_err(|e| e.to_string())?;
    Ok(account)
}

/// Xbox Live -> XSTS -> Minecraft profile, given a valid Microsoft access token.
async fn login_with_ms(ms_access: &str) -> Result<Account, String> {
    let http = client();

    let xbox: serde_json::Value = http
        .post("https://user.auth.xboxlive.com/user/authenticate")
        .json(&json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={ms_access}"),
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let xbox_token = xbox["Token"].as_str().ok_or("Xbox Live hat kein Token geliefert")?;

    let xsts: serde_json::Value = http
        .post("https://xsts.auth.xboxlive.com/xsts/authorize")
        .json(&json!({
            "Properties": { "SandboxId": "RETAIL", "UserTokens": [xbox_token] },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    if xsts.get("XErr").is_some() {
        return Err(format!("Xbox Live hat die Anmeldung abgelehnt ({})", xsts["XErr"]));
    }
    let xsts_token = xsts["Token"].as_str().ok_or("Kein XSTS-Token erhalten")?;
    let uhs = xsts["DisplayClaims"]["xui"][0]["uhs"]
        .as_str()
        .ok_or("Kein User-Hash erhalten")?;

    let mc: serde_json::Value = http
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .json(&json!({ "identityToken": format!("XBL3.0 x={uhs};{xsts_token}") }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let mc_token = mc["access_token"]
        .as_str()
        .ok_or_else(|| format!("Kein Minecraft-Token erhalten: {mc}"))?;

    let profile: serde_json::Value = http
        .get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(mc_token)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let name = profile["name"]
        .as_str()
        .ok_or("Dieser Account besitzt keine Minecraft: Java Edition.")?
        .to_string();
    let raw_id = profile["id"]
        .as_str()
        .ok_or("Dieser Account besitzt keine Minecraft: Java Edition.")?;
    let uuid = dash_uuid(raw_id);

    // The profile's own skins array is the authoritative current skin - avoids
    // depending on a third-party caching proxy (which can lag behind a recent
    // change or simply not have this account cached) for the skin preview.
    let skin_url = profile["skins"]
        .as_array()
        .and_then(|skins| skins.iter().find(|s| s["state"] == "ACTIVE").or_else(|| skins.first()))
        .and_then(|s| s["url"].as_str())
        .map(|s| s.to_string());

    Ok(Account { name, uuid, mc_token: mc_token.to_string(), skin_url })
}

async fn refresh_with_ms(refresh_token: &str) -> Result<(String, String), String> {
    let http = client();
    let res: serde_json::Value = http
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
        .form(&[
            ("client_id", CLIENT_ID),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let access = res["access_token"].as_str().ok_or("Token-Aktualisierung fehlgeschlagen")?;
    let refresh = res["refresh_token"].as_str().unwrap_or(refresh_token);
    Ok((access.to_string(), refresh.to_string()))
}

fn dash_uuid(raw: &str) -> String {
    let raw = raw.replace('-', "");
    if raw.len() != 32 {
        return raw;
    }
    format!(
        "{}-{}-{}-{}-{}",
        &raw[0..8],
        &raw[8..12],
        &raw[12..16],
        &raw[16..20],
        &raw[20..32]
    )
}

/// Refreshes a stored account's Microsoft/Minecraft tokens if it has a refresh
/// token, falling back to the last-known (possibly stale) tokens on failure -
/// better to show a launcher that might need a re-login on Play than to bounce
/// straight back to the login screen just because it was closed overnight.
async fn refreshed(stored: StoredAccount) -> Account {
    if stored.ms_refresh.is_empty() {
        return Account { name: stored.name, uuid: stored.uuid, mc_token: stored.mc_token, skin_url: stored.skin_url };
    }
    match refresh_with_ms(&stored.ms_refresh).await {
        Ok((access, refresh)) => {
            // Microsoft rotates refresh tokens on every use - `stored.ms_refresh` is
            // already invalid now. Persist the new one immediately, even if the
            // Xbox/Minecraft leg below fails, or a transient hiccup here strands the
            // account on a dead refresh token forever (permanent "invalid session").
            let fallback = StoredAccount { ms_refresh: refresh.clone(), ..stored.clone() };
            let _ = state::upsert_account(&fallback);
            match login_with_ms(&access).await {
                Ok(account) => {
                    let _ = state::upsert_account(&StoredAccount {
                        name: account.name.clone(),
                        uuid: account.uuid.clone(),
                        mc_token: account.mc_token.clone(),
                        ms_refresh: refresh,
                        skin_url: account.skin_url.clone(),
                    });
                    account
                }
                Err(_) => Account { name: stored.name, uuid: stored.uuid, mc_token: stored.mc_token, skin_url: stored.skin_url },
            }
        }
        Err(_) => Account { name: stored.name, uuid: stored.uuid, mc_token: stored.mc_token, skin_url: stored.skin_url },
    }
}

#[tauri::command]
pub async fn get_saved_account() -> Result<Option<Account>, String> {
    let Some(stored) = state::load_active_account() else {
        return Ok(None);
    };
    Ok(Some(refreshed(stored).await))
}

#[tauri::command]
pub fn list_accounts() -> Vec<AccountSummary> {
    let accounts = state::load_all_accounts();
    let active = state::load_active_account().map(|a| a.uuid);
    accounts
        .into_iter()
        .map(|a| AccountSummary { active: Some(a.uuid.clone()) == active, name: a.name, uuid: a.uuid })
        .collect()
}

#[tauri::command]
pub async fn select_account(uuid: String) -> Result<Account, String> {
    let stored = state::set_active_account(&uuid)?;
    Ok(refreshed(stored).await)
}

#[tauri::command]
pub fn remove_account(uuid: String) -> Result<(), String> {
    state::remove_account(&uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn logout() -> Result<(), String> {
    if let Some(active) = state::load_active_account() {
        state::remove_account(&active.uuid).map_err(|e| e.to_string())?;
    }
    Ok(())
}
