use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// Same on-disk location the earlier Python/C++ Larp Launcher prototypes used
/// (`%AppData%\LarpLauncher`), so switching to this launcher doesn't orphan an
/// already-logged-in account or already-downloaded game files.
pub fn data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("LarpLauncher")
}

pub fn game_dir() -> PathBuf {
    data_dir().join("minecraft")
}

fn accounts_file() -> PathBuf {
    data_dir().join("accounts.json")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredAccount {
    pub name: String,
    pub uuid: String,
    pub mc_token: String,
    pub ms_refresh: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct AccountsFile {
    accounts: Vec<StoredAccount>,
    active_uuid: Option<String>,
}

fn load_accounts_file() -> AccountsFile {
    // Transparent migration from the single-account `account.json` this launcher
    // used before multi-account support - read it once, fold it into the new
    // list format, and leave the old file alone (harmless if it lingers).
    let legacy = data_dir().join("account.json");
    if !accounts_file().is_file() {
        if let Ok(text) = std::fs::read_to_string(&legacy) {
            if let Ok(account) = serde_json::from_str::<StoredAccount>(&text) {
                let file = AccountsFile { active_uuid: Some(account.uuid.clone()), accounts: vec![account] };
                let _ = save_accounts_file(&file);
                return file;
            }
        }
        return AccountsFile::default();
    }
    std::fs::read_to_string(accounts_file())
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn save_accounts_file(file: &AccountsFile) -> std::io::Result<()> {
    std::fs::create_dir_all(data_dir())?;
    let text = serde_json::to_string_pretty(file)?;
    std::fs::write(accounts_file(), text)
}

pub fn load_all_accounts() -> Vec<StoredAccount> {
    load_accounts_file().accounts
}

pub fn load_active_account() -> Option<StoredAccount> {
    let file = load_accounts_file();
    let active = file.active_uuid.as_deref();
    file.accounts
        .iter()
        .find(|a| Some(a.uuid.as_str()) == active)
        .or(file.accounts.first())
        .cloned()
}

/// Adds a freshly logged-in account (or updates it, if it was already saved) and
/// makes it the active one - matches the expected "just signed in" UX.
pub fn upsert_account(account: &StoredAccount) -> std::io::Result<()> {
    let mut file = load_accounts_file();
    if let Some(existing) = file.accounts.iter_mut().find(|a| a.uuid == account.uuid) {
        *existing = account.clone();
    } else {
        file.accounts.push(account.clone());
    }
    file.active_uuid = Some(account.uuid.clone());
    save_accounts_file(&file)
}

pub fn set_active_account(uuid: &str) -> Result<StoredAccount, String> {
    let mut file = load_accounts_file();
    let account = file.accounts.iter().find(|a| a.uuid == uuid).cloned().ok_or("Unbekannter Account")?;
    file.active_uuid = Some(uuid.to_string());
    save_accounts_file(&file).map_err(|e| e.to_string())?;
    Ok(account)
}

pub fn remove_account(uuid: &str) -> std::io::Result<()> {
    let mut file = load_accounts_file();
    file.accounts.retain(|a| a.uuid != uuid);
    if file.active_uuid.as_deref() == Some(uuid) {
        file.active_uuid = file.accounts.first().map(|a| a.uuid.clone());
    }
    save_accounts_file(&file)
}
