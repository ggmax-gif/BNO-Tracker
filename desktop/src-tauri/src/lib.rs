use tauri_plugin_dialog::DialogExt;

// Export and import run the native file dialog in Rust and act on the path the
// OS hands back, so the frontend never names a filesystem path. That is what
// lets the `fs` capability stay scoped to $APPDATA: JavaScript has no way to
// read or write anywhere else, even though the user can still save a backup
// wherever they like. The alternative - handing JS a generic write(path,
// contents) - would be a whole-disk primitive wearing a narrow name.

#[tauri::command]
async fn export_file(
    app: tauri::AppHandle,
    suggested: String,
    contents: String,
) -> Result<bool, String> {
    match app.dialog().file().set_file_name(&suggested).blocking_save_file() {
        Some(p) => {
            let path = p.into_path().map_err(|e| e.to_string())?;
            std::fs::write(path, contents).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false), // user cancelled
    }
}

#[tauri::command]
async fn import_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    match app
        .dialog()
        .file()
        .add_filter("BNO Tracker backup", &["json"])
        .blocking_pick_file()
    {
        Some(p) => {
            let path = p.into_path().map_err(|e| e.to_string())?;
            let text = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
            Ok(Some(text))
        }
        None => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![export_file, import_file])
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
