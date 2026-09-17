//! Microsoft device-code login -> Xbox Live -> XSTS -> Minecraft profile.
//!
//! Same client ID and the same downstream Xbox/XSTS/Minecraft chain as the
//! earlier Python prototype's auth_ms.py, just started via the device-code
//! flow (a short code + microsoft.com/link) instead of "paste the redirect
//! URL back in" - nicer UX for a native app with no local redirect server.

use serde::Serialize;
use serde_json::json;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::state::{self, StoredAccount};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSummary {
    pub name: String,
    pub uuid: String,
    pub active: bool,
}

const CLIENT_ID: &str = "00000000402b5328";
const SCOPE: &str = "XboxLive.signin offline_access";

#[derive(Default)]
pub struct AuthState {
    pending: Mutex<Option<PendingLogin>>,
}

struct PendingLogin {
    device_code: String,
    interval: Duration,
    next_poll_at: Instant,
}

#[derive(Serialize)]
pub struct DeviceCodeStart {
    #[serde(rename = "userCode")]
    user_code: String,
    #[serde(rename = "verificationUri")]
    verification_uri: String,
    #[serde(rename = "expiresIn")]
    expires_in: u64,
    interval: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub name: String,
    pub uuid: String,
    pub mc_token: String,
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum PollResult {
    Pending,
    Success { account: Account },
    Error { message: String },
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("AeroClient/0.1")
        .build()
        .expect("failed to build http client")
}

#[tauri::command]
pub async fn begin_device_code_login(
    state: tauri::State<'_, AuthState>,
) -> Result<DeviceCodeStart, String> {
    let res: serde_json::Value = client()
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode")
        .form(&[("client_id", CLIENT_ID), ("scope", SCOPE)])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let device_code = res["device_code"]
        .as_str()
        .ok_or("Microsoft hat keinen Device Code zurückgegeben")?
        .to_string();
    let user_code = res["user_code"].as_str().unwrap_or_default().to_string();
    let verification_uri = res["verification_uri"]
        .as_str()
        .unwrap_or("https://microsoft.com/link")
        .to_string();
    let expires_in = res["expires_in"].as_u64().unwrap_or(900);
    let interval = res["interval"].as_u64().unwrap_or(5).max(2);

    *state.pending.lock().unwrap() = Some(PendingLogin {
        device_code,
        interval: Duration::from_secs(interval),
        next_poll_at: Instant::now(),
    });

    Ok(DeviceCodeStart {
        user_code,
        verification_uri,
        expires_in,
        interval,
    })
}

#[tauri::command]
pub async fn poll_device_code_login(
    state: tauri::State<'_, AuthState>,
) -> Result<PollResult, String> {
    let device_code = {
        let mut guard = state.pending.lock().unwrap();
        let pending = match guard.as_mut() {
            Some(p) => p,
            None => return Ok(PollResult::Error { message: "Kein Login läuft.".into() }),
        };
        if Instant::now() < pending.next_poll_at {
            return Ok(PollResult::Pending);
        }
        pending.next_poll_at = Instant::now() + pending.interval;
        pending.device_code.clone()
    };

    let res: serde_json::Value = client()
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
        .form(&[
            ("client_id", CLIENT_ID),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("device_code", device_code.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(access_token) = res["access_token"].as_str() {
        let refresh_token = res["refresh_token"].as_str().unwrap_or_default();
        *state.pending.lock().unwrap() = None;
        return finish_login(access_token, refresh_token).await;
    }

    match res["error"].as_str() {
        Some("authorization_pending") => Ok(PollResult::Pending),
        Some("slow_down") => Ok(PollResult::Pending),
        Some(other) => {
            *state.pending.lock().unwrap() = None;
            Ok(PollResult::Error {
                message: res["error_description"]
                    .as_str()
                    .unwrap_or(other)
                    .to_string(),
            })
        }
        None => Ok(PollResult::Pending),
    }
}

async fn finish_login(ms_access: &str, ms_refresh: &str) -> Result<PollResult, String> {
    match login_with_ms(ms_access).await {
        Ok(account) => {
            state::upsert_account(&StoredAccount {
                name: account.name.clone(),
                uuid: account.uuid.clone(),
                mc_token: account.mc_token.clone(),
                ms_refresh: ms_refresh.to_string(),
            })
            .map_err(|e| e.to_string())?;
            Ok(PollResult::Success { account })
        }
        Err(message) => Ok(PollResult::Error { message }),
    }
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
    let mc_token = mc["access_token"].as_str().ok_or("Kein Minecraft-Token erhalten")?;

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

    Ok(Account { name, uuid, mc_token: mc_token.to_string() })
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
        return Account { name: stored.name, uuid: stored.uuid, mc_token: stored.mc_token };
    }
    match refresh_with_ms(&stored.ms_refresh).await {
        Ok((access, refresh)) => match login_with_ms(&access).await {
            Ok(account) => {
                let _ = state::upsert_account(&StoredAccount {
                    name: account.name.clone(),
                    uuid: account.uuid.clone(),
                    mc_token: account.mc_token.clone(),
                    ms_refresh: refresh,
                });
                account
            }
            Err(_) => Account { name: stored.name, uuid: stored.uuid, mc_token: stored.mc_token },
        },
        Err(_) => Account { name: stored.name, uuid: stored.uuid, mc_token: stored.mc_token },
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
