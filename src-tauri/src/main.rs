#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};

#[derive(serde::Serialize)]
struct DirectoryEntry {
    name: String,
    kind: String,
}

#[derive(Debug, serde::Serialize)]
struct DesktopCommandError {
    code: String,
    message: String,
    path: Option<String>,
}

type DesktopResult<T> = Result<T, DesktopCommandError>;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ensure_directory,
            list_directory,
            path_exists,
            read_binary_file,
            read_text_file,
            remove_directory,
            remove_file,
            resolve_asset_url,
            write_binary_file,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("desktop application failed to start");
}

#[tauri::command]
fn read_text_file(workspace_root: String, path: String) -> DesktopResult<String> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::read_to_string(&file_path)
        .map_err(|error| io_error("desktop.read_text_failed", &file_path, error))
}

#[tauri::command]
fn write_text_file(workspace_root: String, path: String, content: String) -> DesktopResult<()> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| io_error("desktop.create_parent_failed", parent, error))?;
    }

    fs::write(&file_path, content)
        .map_err(|error| io_error("desktop.write_text_failed", &file_path, error))
}

#[tauri::command]
fn read_binary_file(workspace_root: String, path: String) -> DesktopResult<Vec<u8>> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::read(&file_path)
        .map_err(|error| io_error("desktop.read_binary_failed", &file_path, error))
}

#[tauri::command]
fn write_binary_file(
    workspace_root: String,
    path: String,
    content: Vec<u8>,
) -> DesktopResult<()> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| io_error("desktop.create_parent_failed", parent, error))?;
    }

    fs::write(&file_path, content)
        .map_err(|error| io_error("desktop.write_binary_failed", &file_path, error))
}

#[tauri::command]
fn list_directory(workspace_root: String, path: String) -> DesktopResult<Vec<DirectoryEntry>> {
    let directory_path = resolve_workspace_path(&workspace_root, &path)?;
    let entries = fs::read_dir(&directory_path)
        .map_err(|error| io_error("desktop.list_directory_failed", &directory_path, error))?;

    let mut result = Vec::new();

    for entry in entries {
        let entry = entry
            .map_err(|error| io_error("desktop.read_directory_entry_failed", &directory_path, error))?;
        let metadata = entry
            .metadata()
            .map_err(|error| io_error("desktop.read_metadata_failed", &entry.path(), error))?;

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
fn ensure_directory(workspace_root: String, path: String) -> DesktopResult<()> {
    let directory_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::create_dir_all(&directory_path)
        .map_err(|error| io_error("desktop.ensure_directory_failed", &directory_path, error))
}

#[tauri::command]
fn remove_file(workspace_root: String, path: String) -> DesktopResult<()> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::remove_file(&file_path)
        .map_err(|error| io_error("desktop.remove_file_failed", &file_path, error))
}

#[tauri::command]
fn remove_directory(workspace_root: String, path: String) -> DesktopResult<()> {
    let directory_path = resolve_workspace_path(&workspace_root, &path)?;

    fs::remove_dir_all(&directory_path)
        .map_err(|error| io_error("desktop.remove_directory_failed", &directory_path, error))
}

#[tauri::command]
fn path_exists(workspace_root: String, path: String) -> DesktopResult<bool> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    Ok(file_path.exists())
}

#[tauri::command]
fn resolve_asset_url(workspace_root: String, path: String) -> DesktopResult<String> {
    let file_path = resolve_workspace_path(&workspace_root, &path)?;

    if !file_path.exists() {
        return Err(desktop_error(
            "desktop.asset_not_found",
            "Asset file was not found.",
            Some(file_path),
        ));
    }

    Ok(file_path.to_string_lossy().to_string())
}

fn resolve_workspace_path(workspace_root: &str, path: &str) -> DesktopResult<PathBuf> {
    let root = fs::canonicalize(Path::new(workspace_root))
        .map_err(|error| io_error("desktop.workspace_root_unavailable", Path::new(workspace_root), error))?;

    let clean_path = normalize_relative_path(path)?;
    let joined_path = root.join(clean_path);

    if joined_path.exists() {
        let canonical_path = fs::canonicalize(&joined_path)
            .map_err(|error| io_error("desktop.path_unavailable", &joined_path, error))?;

        if !canonical_path.starts_with(&root) {
            return Err(desktop_error(
                "desktop.path_outside_workspace",
                "Path points outside the selected workspace.",
                Some(canonical_path),
            ));
        }

        return Ok(canonical_path);
    }

    let parent = joined_path
        .parent()
        .ok_or_else(|| desktop_error(
            "desktop.path_without_parent",
            "Path has no parent directory.",
            Some(joined_path.clone()),
        ))?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|error| io_error("desktop.parent_unavailable", parent, error))?;

    if !canonical_parent.starts_with(&root) {
        return Err(desktop_error(
            "desktop.path_outside_workspace",
            "Path points outside the selected workspace.",
            Some(joined_path),
        ));
    }

    Ok(joined_path)
}

fn normalize_relative_path(path: &str) -> DesktopResult<PathBuf> {
    let normalized = path.replace('\\', "/");

    if normalized
        .split('/')
        .any(|part| part == "..")
    {
        return Err(desktop_error(
            "desktop.invalid_relative_path",
            "Path must stay inside workspace and must not contain .. segments.",
            Some(PathBuf::from(path)),
        ));
    }

    let trimmed = normalized.trim_start_matches('/');

    Ok(PathBuf::from(trimmed))
}

fn io_error(code: &str, path: &Path, error: std::io::Error) -> DesktopCommandError {
    desktop_error(
        code,
        &format!("{error}"),
        Some(path.to_path_buf()),
    )
}

fn desktop_error(code: &str, message: &str, path: Option<PathBuf>) -> DesktopCommandError {
    DesktopCommandError {
        code: code.to_string(),
        message: message.to_string(),
        path: path.map(|value| value.to_string_lossy().to_string()),
    }
}
