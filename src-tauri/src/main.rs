#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};

#[derive(serde::Serialize)]
struct DirectoryEntry {
    name: String,
    kind: String,
}

fn main() {
    // Пока desktop-spike не добавляет native-команды: WebView открывает текущую web-версию.
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ensure_directory,
            list_directory,
            path_exists,
            read_text_file,
            remove_file,
            resolve_asset_url,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("desktop application failed to start");
}

#[tauri::command]
fn read_text_file(workspace_root: String, path: String) -> Result<String, String> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::read_to_string(file_path)
        .map_err(|error| format!("Не удалось прочитать UTF-8 файл: {error}"))
}

#[tauri::command]
fn write_text_file(workspace_root: String, path: String, content: String) -> Result<(), String> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Не удалось создать папку для файла: {error}"))?;
    }

    fs::write(file_path, content)
        .map_err(|error| format!("Не удалось записать UTF-8 файл: {error}"))
}

#[tauri::command]
fn list_directory(workspace_root: String, path: String) -> Result<Vec<DirectoryEntry>, String> {
    let directory_path = resolve_workspace_path(&workspace_root, &path)?;
    let entries = fs::read_dir(directory_path)
        .map_err(|error| format!("Не удалось прочитать папку: {error}"))?;

    let mut result = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|error| format!("Не удалось прочитать элемент папки: {error}"))?;
        let metadata = entry.metadata()
            .map_err(|error| format!("Не удалось прочитать metadata файла: {error}"))?;

        result.push(DirectoryEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            kind: if metadata.is_dir() {
                "directory".to_string()
            } else {
                "file".to_string()
            },
        });
    }

    Ok(result)
}

#[tauri::command]
fn ensure_directory(workspace_root: String, path: String) -> Result<(), String> {
    let directory_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::create_dir_all(directory_path)
        .map_err(|error| format!("Не удалось создать папку: {error}"))
}

#[tauri::command]
fn remove_file(workspace_root: String, path: String) -> Result<(), String> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::remove_file(file_path)
        .map_err(|error| format!("Не удалось удалить файл: {error}"))
}

#[tauri::command]
fn path_exists(workspace_root: String, path: String) -> Result<bool, String> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    Ok(file_path.exists())
}

#[tauri::command]
fn resolve_asset_url(workspace_root: String, path: String) -> Result<String, String> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    if !file_path.exists() {
        return Err("Asset не найден".to_string());
    }

    Ok(format!("file://{}", file_path.to_string_lossy().replace('\\', "/")))
}

fn resolve_workspace_path(workspace_root: &str, path: &str) -> Result<PathBuf, String> {
    let root = fs::canonicalize(Path::new(workspace_root))
        .map_err(|error| format!("Workspace root недоступен: {error}"))?;

    let clean_path = normalize_relative_path(path)?;
    let joined_path = root.join(clean_path);

    if joined_path.exists() {
        let canonical_path = fs::canonicalize(&joined_path)
            .map_err(|error| format!("Путь внутри workspace недоступен: {error}"))?;

        if !canonical_path.starts_with(&root) {
            return Err("Путь выходит за пределы workspace".to_string());
        }

        return Ok(canonical_path);
    }

    let parent = joined_path.parent()
        .ok_or_else(|| "У пути нет родительской папки".to_string())?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|error| format!("Родительская папка недоступна: {error}"))?;

    if !canonical_parent.starts_with(&root) {
        return Err("Путь выходит за пределы workspace".to_string());
    }

    Ok(joined_path)
}

fn normalize_relative_path(path: &str) -> Result<PathBuf, String> {
    let normalized = path.replace('\\', "/");

    if normalized.contains("..") {
        return Err("Путь не должен содержать ..".to_string());
    }

    let trimmed = normalized.trim_start_matches('/');

    Ok(PathBuf::from(trimmed))
}
