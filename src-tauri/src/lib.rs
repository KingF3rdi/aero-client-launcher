mod auth;
mod instances;
mod launch;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .manage(auth::AuthState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::begin_device_code_login,
            auth::poll_device_code_login,
            auth::get_saved_account,
            auth::logout,
            instances::get_instances,
            launch::launch_instance,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
