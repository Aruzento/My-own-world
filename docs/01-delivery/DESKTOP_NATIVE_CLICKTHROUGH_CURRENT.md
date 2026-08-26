---
summary: "Current native desktop click-through report."
read_when:
  - "Before desktop release handoff"
  - "When validating the native Tauri window"
owner_zone: "delivery"
---

# Desktop Native Click-Through Current

Run date: 2026-08-26T06:12:56.565Z

Plan ref: `0.0.1.14.FINAL` (runner introduced in `0.0.1.2.2`)

Workspace: `C:\Users\Aruko\AppData\Local\Temp\mow-dice-final-native-smoke-5b2cd1dd2af14705b4c5102c8eee6942`

Executable: `C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

Status: passed

Fatal error: none

## Steps

- launch native desktop app with WebView2 remote debugging: passed (1988 ms)
- restore workspace through desktop adapter: passed (820 ms)
- open representative card with image when available: passed (98 ms)
- open settings workspace diagnostics panel: passed (449 ms)
- scroll and search the large tree: passed (183 ms)
- open heavy campaign map: passed (71 ms)
- open presentation window from the heavy map: passed (701 ms)

## Targets

### Representative Cards

- Добро пожаловать - 2 KB, tokens: 0, shapes: 0, fog markers: 0, images: 0, image assets: 0, file: `0001-welcome.md`

### Image Cards

- No campaign map target was found.

### Heavy Maps

- Учебная карта - 947 B, tokens: 0, shapes: 0, fog markers: 0, images: 0, image assets: 0, file: `0002-campaign-map.md`

## Metrics

```json
{
  "cdpEndpoint": "http://127.0.0.1:57170",
  "workspace": {
    "title": "MyOwnWorld",
    "treeItems": 3,
    "virtualized": false,
    "statusbar": "Пустая страница"
  },
  "card": {
    "currentPageId": "sample-welcome-card",
    "title": "Добро пожаловать",
    "hasCardShell": true,
    "imageCount": 0,
    "loadedImages": 0,
    "imageAssets": [],
    "imageSources": [],
    "textLength": 1883,
    "statusbar": "Save conflict: newer change kept",
    "searchQuery": "Добро пожаловать",
    "attemptedTargets": 1
  },
  "diagnostics": {
    "cards": 12,
    "sections": 10,
    "hasWriteProbe": true,
    "textSample": "Состояние рабочей папкиРежим: desktopРабочая папка: \\\\?\\C:\\Users\\Aruko\\AppData\\Local\\Temp\\mow-dice-final-native-smoke-5b2cd1dd2af14705b4c5102c8eee6942Расположение: network folderМатрица доступа: Workspace in network folder: matchedЗапись: OKПроба записи: Write probe OK.Схема: OKПроверка: Еще не запускалсяРезервные копии: 0 шт.Папка резервных копий: \\\\?\\C:\\Users\\Aruko\\AppData\\Local\\Temp\\mow-dice-final-native-smoke-5b2cd1dd2af14705b4c5102c8eee6942\\.my-own-world-backupsПоследняя операция: backup.li"
  },
  "treeAfterSearch": {
    "renderedItems": 1,
    "scrollTop": 0,
    "scrollHeight": 788,
    "clientHeight": 788,
    "virtualized": false
  },
  "map": {
    "title": "Учебная карта",
    "toolbar": true,
    "stage": true,
    "mapAsset": "",
    "tokens": 0,
    "shapes": 0,
    "fogCanvas": true,
    "backgroundElement": true,
    "backgroundImageSet": false,
    "backgroundRenderable": false,
    "backgroundImagePreview": ""
  },
  "presentation": {
    "url": "http://tauri.localhost/presentation.html",
    "map": true,
    "status": "ready",
    "tokens": 0,
    "shapes": 0,
    "fogCanvas": false
  }
}
```

## Console And Page Errors

- warning: Не удалось восстановить состояние дерева из workspace: Error: Не удается найти указанный файл. (os error 2)
    at normalizeTauriCommandError (http://tauri.localhost/js/storage/tauriBridge.js:72:7)
    at invokeTauriCommand (http://tauri.localhost/js/storage/tauriBridge.js:34:13)
    at async restoreWorkspaceTreeExpansionState (http://tauri.localhost/js/tree/tree.js:1700:9)
    at async http://tauri.localhost/js/app.js:261:3
- warning: Workspace schema: schema issues found: 9 [Object, Object, Object, Object, Object, Object, Object, Object, Object]
- warning: Не удалось восстановить состояние дерева из workspace: Error: Не удается найти указанный файл. (os error 2)
    at normalizeTauriCommandError (http://tauri.localhost/js/storage/tauriBridge.js:72:7)
    at invokeTauriCommand (http://tauri.localhost/js/storage/tauriBridge.js:34:13)
    at async restoreWorkspaceTreeExpansionState (http://tauri.localhost/js/tree/tree.js:1700:9)
    at async http://tauri.localhost/js/app.js:261:3

## Unexpected Runtime Errors

- No unexpected runtime errors captured.

## Allowlisted Runtime Events

- No allowlisted runtime events captured.

## Resource Issues

- No failed resource responses captured.

## Notes

- The runner uses WebView2 remote debugging to click the real Tauri WebView.
- It opens a card with an image when one exists, then Settings diagnostics, tree search, a heavy map and presentation mode.
- Image-card assets must load as visible `img[data-asset]` elements; map assets must produce a visible campaign map background.
- It does not create, move or delete workspace pages.
- It sets only `myOwnWorld.desktop.workspaceRoot` in the app WebView localStorage so the desktop adapter can restore the selected workspace.
