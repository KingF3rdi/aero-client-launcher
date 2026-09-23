mod auth;
mod capes;
mod content;
mod instances;
mod launch;
mod selfupdate;
mod skin;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(launch::GameState::default())
        .setup(|app| {
            tauri::async_runtime::spawn(selfupdate::check(app.handle().clone()));
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
            auth::login_with_browser,
            auth::get_saved_account,
            auth::list_accounts,
            auth::select_account,
            auth::remove_account,
            auth::logout,
            instances::get_instances,
            instances::update_instance,
            instances::delete_instance,
            instances::duplicate_instance,
            instances::add_instance,
            instances::get_instance_log,
            instances::list_instance_content,
            instances::toggle_content_file,
            instances::delete_content_file,
            launch::launch_instance,
            launch::stop_instance,
            skin::upload_skin,
            content::search_content,
            content::install_content,
            content::install_modpack,
            content::import_modpack_file,
            content::export_modpack,
            content::fetch_content_icons,
            capes::list_capes,
            capes::publish_cape,
            capes::delete_cape,
            capes::equipped_cape,
            capes::equip_cape,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
