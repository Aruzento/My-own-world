#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

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

#[derive(Default)]
struct WorkspaceRootState {
    root: Mutex<Option<PathBuf>>,
}

fn main() {
    tauri::Builder::default()
        .manage(WorkspaceRootState::default())
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
            set_workspace_root,
            write_binary_file,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("desktop application failed to start");
}

#[tauri::command]
fn set_workspace_root(
    app: tauri::AppHandle,
    state: tauri::State<'_, WorkspaceRootState>,
    workspace_root: String,
) -> DesktopResult<String> {
    let root = fs::canonicalize(Path::new(&workspace_root)).map_err(|error| {
        io_error(
            "desktop.workspace_root_unavailable",
            Path::new(&workspace_root),
            error,
        )
    })?;

    if !root.is_dir() {
        return Err(desktop_error(
            "desktop.workspace_root_not_directory",
            "Workspace root must be an existing directory.",
            Some(root),
        ));
    }

    app.asset_protocol_scope()
        .allow_directory(&root, true)
        .map_err(|error| {
            desktop_error(
                "desktop.asset_scope_failed",
                &format!("Workspace asset scope could not be registered: {error}"),
                Some(root.clone()),
            )
        })?;

    let mut stored_root = state.root.lock().map_err(|_| {
        desktop_error(
            "desktop.workspace_root_state_unavailable",
            "Workspace root state is unavailable.",
            None,
        )
    })?;

    *stored_root = Some(root.clone());

    Ok(root.to_string_lossy().to_string())
}

#[tauri::command]
fn read_text_file(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
) -> DesktopResult<String> {
    let root = get_workspace_root(&state)?;
    let file_path = resolve_workspace_path(&root, &path)?;

    fs::read_to_string(&file_path)
        .map_err(|error| io_error("desktop.read_text_failed", &file_path, error))
}

#[tauri::command]
fn write_text_file(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
    content: String,
) -> DesktopResult<()> {
    let root = get_workspace_root(&state)?;
    let file_path = resolve_workspace_path(&root, &path)?;

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| io_error("desktop.create_parent_failed", parent, error))?;
    }

    atomic_write(&file_path, content.as_bytes(), "desktop.write_text_failed")
}

#[tauri::command]
fn read_binary_file(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
) -> DesktopResult<Vec<u8>> {
    let root = get_workspace_root(&state)?;
    let file_path = resolve_workspace_path(&root, &path)?;

    fs::read(&file_path).map_err(|error| io_error("desktop.read_binary_failed", &file_path, error))
}

#[tauri::command]
fn write_binary_file(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
    content: Vec<u8>,
) -> DesktopResult<()> {
    let root = get_workspace_root(&state)?;
    let file_path = resolve_workspace_path(&root, &path)?;

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| io_error("desktop.create_parent_failed", parent, error))?;
    }

    atomic_write(&file_path, &content, "desktop.write_binary_failed")
}

#[tauri::command]
fn list_directory(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
) -> DesktopResult<Vec<DirectoryEntry>> {
    let root = get_workspace_root(&state)?;
    let directory_path = resolve_workspace_path(&root, &path)?;
    let entries = fs::read_dir(&directory_path)
        .map_err(|error| io_error("desktop.list_directory_failed", &directory_path, error))?;

    let mut result = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|error| {
            io_error(
                "desktop.read_directory_entry_failed",
                &directory_path,
                error,
            )
        })?;
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
fn ensure_directory(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
) -> DesktopResult<()> {
    let root = get_workspace_root(&state)?;
    let directory_path = resolve_workspace_path(&root, &path)?;

    fs::create_dir_all(&directory_path)
        .map_err(|error| io_error("desktop.ensure_directory_failed", &directory_path, error))
}

#[tauri::command]
fn remove_file(state: tauri::State<'_, WorkspaceRootState>, path: String) -> DesktopResult<()> {
    let root = get_workspace_root(&state)?;
    let file_path = resolve_workspace_path(&root, &path)?;

    match fs::remove_file(&file_path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Err(desktop_error(
            "desktop.file_not_found",
            "File was not found.",
            Some(file_path),
        )),
        Err(error) => Err(io_error("desktop.remove_file_failed", &file_path, error)),
    }
}

#[tauri::command]
fn remove_directory(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
) -> DesktopResult<()> {
    let root = get_workspace_root(&state)?;
    reject_workspace_root_delete(&path)?;
    let directory_path = resolve_workspace_path(&root, &path)?;

    if directory_path == root {
        return Err(desktop_error(
            "desktop.workspace_root_delete_rejected",
            "Workspace root cannot be removed by remove_directory.",
            Some(directory_path),
        ));
    }

    fs::remove_dir_all(&directory_path)
        .map_err(|error| io_error("desktop.remove_directory_failed", &directory_path, error))
}

#[tauri::command]
fn path_exists(state: tauri::State<'_, WorkspaceRootState>, path: String) -> DesktopResult<bool> {
    let root = get_workspace_root(&state)?;
    let file_path = resolve_workspace_path(&root, &path)?;

    Ok(file_path.exists())
}

#[tauri::command]
fn resolve_asset_url(
    state: tauri::State<'_, WorkspaceRootState>,
    path: String,
) -> DesktopResult<String> {
    let root = get_workspace_root(&state)?;
    let file_path = resolve_workspace_path(&root, &path)?;

    if !file_path.exists() {
        return Err(desktop_error(
            "desktop.asset_not_found",
            "Asset file was not found.",
            Some(file_path),
        ));
    }

    Ok(file_path.to_string_lossy().to_string())
}

fn get_workspace_root(state: &tauri::State<'_, WorkspaceRootState>) -> DesktopResult<PathBuf> {
    let stored_root = state.root.lock().map_err(|_| {
        desktop_error(
            "desktop.workspace_root_state_unavailable",
            "Workspace root state is unavailable.",
            None,
        )
    })?;

    stored_root.clone().ok_or_else(|| {
        desktop_error(
            "desktop.workspace_root_not_selected",
            "Workspace root has not been selected.",
            None,
        )
    })
}

fn resolve_workspace_path(root: &Path, path: &str) -> DesktopResult<PathBuf> {
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

    if !nearest_existing_parent_is_inside(root, &joined_path)? {
        return Err(desktop_error(
            "desktop.path_outside_workspace",
            "Path points outside the selected workspace.",
            Some(joined_path),
        ));
    }

    Ok(joined_path)
}

fn nearest_existing_parent_is_inside(root: &Path, path: &Path) -> DesktopResult<bool> {
    let mut current = path;

    while let Some(parent) = current.parent() {
        if parent.exists() {
            let canonical_parent = fs::canonicalize(parent)
                .map_err(|error| io_error("desktop.path_unavailable", parent, error))?;

            return Ok(canonical_parent.starts_with(root));
        }

        current = parent;
    }

    Ok(false)
}

fn normalize_relative_path(path: &str) -> DesktopResult<PathBuf> {
    let normalized = path.replace('\\', "/");

    if normalized.split('/').any(|part| part == "..") {
        return Err(desktop_error(
            "desktop.invalid_relative_path",
            "Path must stay inside workspace and must not contain .. segments.",
            Some(PathBuf::from(path)),
        ));
    }

    let trimmed = normalized.trim_start_matches('/');
    let relative_path = PathBuf::from(trimmed);

    if relative_path.is_absolute()
        || relative_path.components().any(|component| {
            matches!(
                component,
                std::path::Component::Prefix(_)
                    | std::path::Component::RootDir
                    | std::path::Component::ParentDir
            )
        })
    {
        return Err(desktop_error(
            "desktop.invalid_relative_path",
            "Path must be a relative workspace path.",
            Some(PathBuf::from(path)),
        ));
    }

    Ok(relative_path)
}

fn reject_workspace_root_delete(path: &str) -> DesktopResult<()> {
    let normalized = path.replace('\\', "/");
    let trimmed = normalized.trim_matches('/');

    if trimmed.is_empty() || trimmed == "." {
        return Err(desktop_error(
            "desktop.workspace_root_delete_rejected",
            "Workspace root cannot be removed by remove_directory.",
            Some(PathBuf::from(path)),
        ));
    }

    Ok(())
}

fn atomic_write(path: &Path, content: &[u8], error_code: &str) -> DesktopResult<()> {
    let parent = path.parent().ok_or_else(|| {
        desktop_error(
            "desktop.invalid_write_path",
            "Write path must have a parent directory.",
            Some(path.to_path_buf()),
        )
    })?;

    let temp_path = create_temp_write_path(parent, path);

    {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)
            .map_err(|error| io_error(error_code, &temp_path, error))?;

        file.write_all(content)
            .map_err(|error| io_error(error_code, &temp_path, error))?;

        file.sync_all()
            .map_err(|error| io_error(error_code, &temp_path, error))?;
    }

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        io_error(error_code, path, error)
    })
}

fn create_temp_write_path(parent: &Path, target: &Path) -> PathBuf {
    let file_name = target
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "workspace-write".to_string());

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);

    parent.join(format!(".{file_name}.{timestamp}.tmp"))
}

fn io_error(code: &str, path: &Path, error: std::io::Error) -> DesktopCommandError {
    if let Some(raw) = error.raw_os_error() {
        if raw == 32 || raw == 33 {
            return desktop_error(
                "desktop.file_locked",
                &format!("{error}"),
                Some(path.to_path_buf()),
            );
        }
    }

    let normalized_code = match error.kind() {
        std::io::ErrorKind::NotFound => "desktop.file_not_found",
        std::io::ErrorKind::PermissionDenied => "desktop.permission_denied",
        std::io::ErrorKind::AlreadyExists => "desktop.already_exists",
        _ => code,
    };

    desktop_error(
        normalized_code,
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_workspace(name: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "my-own-world-{name}-{}-{timestamp}",
            std::process::id()
        ));
        fs::create_dir_all(&path).unwrap();
        fs::canonicalize(path).unwrap()
    }

    #[test]
    fn root_delete_paths_are_rejected() {
        assert_eq!(
            reject_workspace_root_delete("").unwrap_err().code,
            "desktop.workspace_root_delete_rejected"
        );
        assert_eq!(
            reject_workspace_root_delete(".").unwrap_err().code,
            "desktop.workspace_root_delete_rejected"
        );
        assert!(reject_workspace_root_delete("pages").is_ok());
    }

    #[test]
    fn resolve_rejects_parent_escape() {
        let root = temp_workspace("escape");

        let error = resolve_workspace_path(&root, "../outside.md").unwrap_err();

        assert_eq!(error.code, "desktop.invalid_relative_path");

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn atomic_write_replaces_file_content() {
        let root = temp_workspace("atomic-write");
        let file_path = root.join("page.md");

        atomic_write(&file_path, b"first", "desktop.write_text_failed").unwrap();
        atomic_write(&file_path, b"second", "desktop.write_text_failed").unwrap();

        assert_eq!(fs::read_to_string(&file_path).unwrap(), "second");

        let temp_leftovers = fs::read_dir(&root)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp"))
            .count();

        assert_eq!(temp_leftovers, 0);

        let _ = fs::remove_dir_all(root);
    }
}
