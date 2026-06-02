// Единая точка доступа к Tauri API.
// Нужна потому, что browser-версия работает без bundler, а desktop WebView
// может отдавать Tauri API через глобальный объект window.__TAURI__.

export function isTauriRuntime() {

  return Boolean(
    globalThis.__TAURI__ ||
    globalThis.__TAURI_INTERNALS__
  );
}


export async function invokeTauriCommand(
  command,
  payload
) {

  const globalInvoke =
    globalThis.__TAURI__?.core?.invoke ||
    globalThis.__TAURI_INTERNALS__?.invoke;

  if (typeof globalInvoke === 'function') {

    return globalInvoke(
      command,
      payload
    );
  }

  const {
    invoke
  } =
    await import('@tauri-apps/api/core');

  return invoke(
    command,
    payload
  );
}


export async function openTauriDirectoryDialog(
  options
) {

  const globalOpen =
    globalThis.__TAURI__?.dialog?.open;

  if (typeof globalOpen === 'function') {

    return globalOpen(
      options
    );
  }

  const {
    open
  } =
    await import('@tauri-apps/plugin-dialog');

  return open(
    options
  );
}


export async function convertTauriFileSrc(
  filePath
) {

  const globalConvert =
    globalThis.__TAURI__?.core?.convertFileSrc;

  const internalConvert =
    globalThis.__TAURI_INTERNALS__?.convertFileSrc;

  if (typeof globalConvert === 'function') {

    return globalConvert(
      normalizeFilePathForTauri(filePath),
      'asset'
    );
  }

  if (typeof internalConvert === 'function') {

    return internalConvert(
      normalizeFilePathForTauri(filePath),
      'asset'
    );
  }

  const {
    convertFileSrc
  } =
    await import('@tauri-apps/api/core');

  return convertFileSrc(
    normalizeFilePathForTauri(filePath),
    'asset'
  );
}


export async function openTauriWebviewWindow(
  label,
  options = {}
) {

  const GlobalWebviewWindow =
    globalThis.__TAURI__?.webviewWindow?.WebviewWindow;

  if (typeof GlobalWebviewWindow === 'function') {

    return new GlobalWebviewWindow(
      label,
      options
    );
  }

  const {
    WebviewWindow
  } =
    await import('@tauri-apps/api/webviewWindow');

  return new WebviewWindow(
    label,
    options
  );
}


function normalizeFilePathForTauri(
  value
) {

  return String(value || '')
    .replace(/^file:\/\//, '')
    .replace(/\//g, '\\');
}
