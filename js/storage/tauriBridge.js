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
