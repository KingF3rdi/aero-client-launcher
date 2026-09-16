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

fn account_file() -> PathBuf {
    data_dir().join("account.json")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredAccount {
    pub name: String,
    pub uuid: String,
    pub mc_token: String,
    pub ms_refresh: String,
}

pub fn load_account() -> Option<StoredAccount> {
    let text = std::fs::read_to_string(account_file()).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn save_account(account: &StoredAccount) -> std::io::Result<()> {
    std::fs::create_dir_all(data_dir())?;
    let text = serde_json::to_string_pretty(account)?;
    std::fs::write(account_file(), text)
}

pub fn clear_account() -> std::io::Result<()> {
    let path = account_file();
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}
