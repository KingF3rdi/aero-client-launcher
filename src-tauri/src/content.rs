//! Browsing and installing mods/resourcepacks/shaders/modpacks from Modrinth's
//! public API, plus importing a local `.mrpack` file - the same format
//! Modrinth's own launcher uses, so packs exported from there import here too.

use std::collections::HashMap;
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::instances::{self, Instance};

const API: &str = "https://api.modrinth.com/v2";

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("LarpLauncher/0.1 (larp.gg)")
        .build()
        .expect("failed to build http client")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentSummary {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub icon_url: Option<String>,
    pub downloads: u64,
    pub project_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentPage {
    pub hits: Vec<ContentSummary>,
    pub total_hits: u64,
}

/// `project_type` is one of "mod" | "resourcepack" | "shader" | "modpack".
/// Paginated (100 per page, Modrinth's max) and sorted by downloads by
/// default so an empty query still surfaces the whole catalog page by page
/// instead of an arbitrary 30-result snapshot.
#[tauri::command]
pub async fn search_content(
    query: String,
    project_type: String,
    mc_version: String,
    offset: u32,
) -> Result<ContentPage, String> {
    let mut facets = vec![vec![format!("project_type:{project_type}")]];
    if !mc_version.is_empty() {
        facets.push(vec![format!("versions:{mc_version}")]);
    }
    if project_type != "modpack" {
        facets.push(vec!["categories:fabric".to_string()]);
    }
    let facets_json = serde_json::to_string(&facets).map_err(|e| e.to_string())?;
    let offset_str = offset.to_string();

    let res: Value = client()
        .get(format!("{API}/search"))
        .query(&[
            ("query", query.as_str()),
            ("facets", facets_json.as_str()),
            ("index", "downloads"),
            ("limit", "100"),
            ("offset", offset_str.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let hits = res["hits"].as_array().cloned().unwrap_or_default();
    Ok(ContentPage {
        total_hits: res["total_hits"].as_u64().unwrap_or(0),
        hits: hits
            .into_iter()
            .map(|h| ContentSummary {
                id: h["project_id"].as_str().unwrap_or_default().to_string(),
                slug: h["slug"].as_str().unwrap_or_default().to_string(),
                title: h["title"].as_str().unwrap_or_default().to_string(),
                description: h["description"].as_str().unwrap_or_default().to_string(),
                icon_url: h["icon_url"].as_str().map(|s| s.to_string()),
                downloads: h["downloads"].as_u64().unwrap_or(0),
                project_type: h["project_type"].as_str().unwrap_or(&project_type).to_string(),
            })
            .collect(),
    })
}

/// Picks the best version of a Modrinth project for an instance: prefers one
/// that explicitly lists both the instance's mc version and the fabric loader,
/// falling back to the newest version at all so an install attempt still gets
/// *something* rather than failing outright on an imperfect match.
async fn best_version(http: &reqwest::Client, project_id: &str, mc_version: &str) -> Result<Value, String> {
    let versions: Value = http
        .get(format!("{API}/project/{project_id}/version"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let versions = versions.as_array().cloned().unwrap_or_default();
    if versions.is_empty() {
        return Err("Keine Versionen für dieses Projekt gefunden".to_string());
    }
    let matches = |v: &Value, need_loader: bool| {
        let has_version = v["game_versions"].as_array().is_some_and(|a| a.iter().any(|g| g.as_str() == Some(mc_version)));
        let has_loader = !need_loader || v["loaders"].as_array().is_some_and(|a| a.iter().any(|l| l.as_str() == Some("fabric")));
        has_version && has_loader
    };
    versions
        .iter()
        .find(|v| matches(v, true))
        .or_else(|| versions.iter().find(|v| matches(v, false)))
        .or_else(|| versions.first())
        .cloned()
        .ok_or_else(|| "Keine passende Version gefunden".to_string())
}

fn primary_file(version: &Value) -> Result<(String, String), String> {
    let files = version["files"].as_array().ok_or("Keine Dateien in dieser Version")?;
    let file = files
        .iter()
        .find(|f| f["primary"] == true)
        .or_else(|| files.first())
        .ok_or("Keine Dateien in dieser Version")?;
    let url = file["url"].as_str().ok_or("Keine Download-URL")?.to_string();
    let filename = file["filename"].as_str().unwrap_or("download.jar").to_string();
    Ok((url, filename))
}

async fn download_bytes(http: &reqwest::Client, url: &str) -> Result<Vec<u8>, String> {
    Ok(http.get(url).send().await.map_err(|e| e.to_string())?.bytes().await.map_err(|e| e.to_string())?.to_vec())
}

fn content_subfolder(project_type: &str) -> &'static str {
    match project_type {
        "resourcepack" => "resourcepacks",
        "shader" => "shaderpacks",
        _ => "mods",
    }
}

#[tauri::command]
pub async fn install_content(project_id: String, project_type: String, instance_id: String) -> Result<String, String> {
    let instance = instances::find(&instance_id).ok_or("Unbekannte Instanz")?;
    let http = client();
    let version = best_version(&http, &project_id, &instance.mc_version).await?;
    let (url, filename) = primary_file(&version)?;
    let bytes = download_bytes(&http, &url).await?;
    let dest_dir = instances::instance_dir(&instance.id).join(content_subfolder(&project_type));
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    std::fs::write(dest_dir.join(&filename), &bytes).map_err(|e| e.to_string())?;
    Ok(filename)
}

// --- Modpacks (.mrpack) ---------------------------------------------------

#[derive(Deserialize)]
struct MrpackIndex {
    name: String,
    files: Vec<MrpackFile>,
    dependencies: HashMap<String, String>,
}

#[derive(Deserialize)]
struct MrpackFile {
    path: String,
    downloads: Vec<String>,
    #[serde(default)]
    env: Option<MrpackEnv>,
}

#[derive(Deserialize)]
struct MrpackEnv {
    client: String,
}

/// Extracts a `.mrpack` (a zip: `modrinth.index.json` + an `overrides/` folder)
/// into a brand new instance: creates the instance record with the pack's own
/// Minecraft version, downloads every listed file, then copies `overrides/`
/// (and `client-overrides/`) straight into the instance directory.
async fn apply_mrpack(bytes: Vec<u8>, requested_name: Option<String>) -> Result<Instance, String> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).map_err(|e| format!("Ungültige .mrpack-Datei: {e}"))?;

    let index: MrpackIndex = {
        let mut entry = archive.by_name("modrinth.index.json").map_err(|_| "modrinth.index.json fehlt in der .mrpack-Datei".to_string())?;
        let mut text = String::new();
        entry.read_to_string(&mut text).map_err(|e| e.to_string())?;
        serde_json::from_str(&text).map_err(|e| format!("modrinth.index.json konnte nicht gelesen werden: {e}"))?
    };

    let mc_version = index.dependencies.get("minecraft").cloned().ok_or("Modpack nennt keine Minecraft-Version")?;
    if !index.dependencies.contains_key("fabric-loader") {
        return Err("Nur Fabric-Modpacks werden unterstützt (dieses Modpack nutzt einen anderen Loader).".to_string());
    }

    let name = requested_name.unwrap_or(index.name);
    let instance = instances::add_instance(name, mc_version).map_err(|e| e)?;
    let dir = instances::instance_dir(&instance.id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let http = client();
    for file in &index.files {
        if let Some(env) = &file.env {
            if env.client == "unsupported" {
                continue;
            }
        }
        let Some(url) = file.downloads.first() else { continue };
        let bytes = download_bytes(&http, url).await?;
        let dest = dir.join(&file.path);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
    }

    // overrides/ and client-overrides/ apply directly on top of the instance dir.
    for i in 0..archive.len() {
        let mut zip_entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = zip_entry.name().to_string();
        let rel = name.strip_prefix("overrides/").or_else(|| name.strip_prefix("client-overrides/"));
        let Some(rel) = rel else { continue };
        if rel.is_empty() || zip_entry.is_dir() {
            continue;
        }
        let dest: PathBuf = dir.join(rel);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut buf = Vec::new();
        zip_entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        std::fs::write(&dest, &buf).map_err(|e| e.to_string())?;
    }

    Ok(instance)
}

#[tauri::command]
pub async fn install_modpack(project_id: String, instance_name: Option<String>) -> Result<Instance, String> {
    let http = client();
    // Modpacks aren't tied to one mc_version up front the way mod installs are,
    // so this just takes the newest version's own .mrpack regardless of version.
    let version = best_version(&http, &project_id, "").await?;
    let (url, _) = primary_file(&version)?;
    let bytes = download_bytes(&http, &url).await?;
    apply_mrpack(bytes, instance_name).await
}

#[tauri::command]
pub async fn import_modpack_file(path: String, instance_name: Option<String>) -> Result<Instance, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Datei konnte nicht gelesen werden: {e}"))?;
    apply_mrpack(bytes, instance_name).await
}

/// Zips an instance's mods/resourcepacks/shaderpacks/config as `overrides/` in a
/// `.mrpack`, with an empty `files: []` list - valid per the mrpack spec, and
/// simpler than resolving each installed jar back to a Modrinth project/version
/// (which would need a hash lookup per file for no real benefit here, since the
/// actual bytes are already on disk and get bundled directly).
fn add_dir_recursive(zip: &mut zip::ZipWriter<std::fs::File>, dir: &Path, zip_prefix: &str, options: zip::write::SimpleFileOptions) -> Result<(), String> {
    let Ok(entries) = std::fs::read_dir(dir) else { return Ok(()) };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let zip_path = format!("{zip_prefix}/{name}");
        if path.is_dir() {
            add_dir_recursive(zip, &path, &zip_path, options)?;
        } else {
            let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
            zip.start_file(zip_path, options).map_err(|e| e.to_string())?;
            zip.write_all(&bytes).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn export_modpack(id: String, dest_path: String) -> Result<(), String> {
    let instance = instances::find(&id).ok_or("Unbekannte Instanz")?;
    let loader_version = crate::launch::latest_fabric_loader_version(&client(), &instance.mc_version).await?;

    let index = serde_json::json!({
        "formatVersion": 1,
        "game": "minecraft",
        "versionId": "1.0.0",
        "name": instance.name,
        "files": [],
        "dependencies": {
            "minecraft": instance.mc_version,
            "fabric-loader": loader_version,
        }
    });

    let file = std::fs::File::create(&dest_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("modrinth.index.json", options).map_err(|e| e.to_string())?;
    zip.write_all(serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?.as_bytes())
        .map_err(|e| e.to_string())?;

    let dir = instances::instance_dir(&instance.id);
    for folder in ["mods", "resourcepacks", "shaderpacks", "config"] {
        add_dir_recursive(&mut zip, &dir.join(folder), &format!("overrides/{folder}"), options)?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}
