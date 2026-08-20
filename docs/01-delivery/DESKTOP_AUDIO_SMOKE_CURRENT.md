---
summary: "Current native desktop audio smoke report."
read_when:
  - "Before desktop release handoff"
  - "When validating the native Tauri window"
owner_zone: "delivery"
---

# Desktop Native Audio Smoke Current

Run date: 2026-08-20T12:07:35.961Z

Plan ref: `0.0.1.11.8` (runner introduced in `0.0.1.2.2`)

Workspace: `C:\Users\Aruko\AppData\Local\Temp\mow-audio-smoke-19db926f531b4c9992467e6aa7e67373`

Executable: `C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

Status: passed

Fatal error: none

## Steps

- launch native desktop app with WebView2 remote debugging: passed (1048 ms)
- restore workspace through desktop adapter: passed (771 ms)
- open representative card with image when available: passed (87 ms)
- open settings workspace diagnostics panel: passed (312 ms)
- scroll and search the large tree: passed (183 ms)
- open heavy campaign map: passed (27 ms)
- exercise campaign map music import and playback: passed (2103 ms)
- open presentation window from the heavy map: passed (657 ms)

## Targets

### Representative Cards

- Добро пожаловать - 2 KB, tokens: 0, shapes: 0, fog markers: 0, images: 0, image assets: 0, file: `0001-welcome.md`

### Image Cards

- No campaign map target was found.

### Heavy Maps

- Учебная карта B - 949 B, tokens: 0, shapes: 0, fog markers: 0, images: 0, image assets: 0, file: `0004-campaign-map-b.md`
- Учебная карта - 947 B, tokens: 0, shapes: 0, fog markers: 0, images: 0, image assets: 0, file: `0002-campaign-map.md`

## Metrics

```json
{
  "cdpEndpoint": "http://127.0.0.1:61487",
  "workspace": {
    "title": "MyOwnWorld",
    "treeItems": 4,
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
    "statusbar": "Saved",
    "searchQuery": "Добро пожаловать",
    "attemptedTargets": 1
  },
  "diagnostics": {
    "cards": 9,
    "sections": 7,
    "hasWriteProbe": true,
    "textSample": "Состояние рабочей папкиРежим: desktopРабочая папка: \\\\?\\C:\\Users\\Aruko\\AppData\\Local\\Temp\\mow-audio-smoke-19db926f531b4c9992467e6aa7e67373Расположение: network folderМатрица доступа: Workspace in network folder: matchedЗапись: OKПроба записи: Write probe OK.Схема: OKПроверка: Еще не запускалсяРезервные копии: 0 шт.Папка резервных копий: \\\\?\\C:\\Users\\Aruko\\AppData\\Local\\Temp\\mow-audio-smoke-19db926f531b4c9992467e6aa7e67373\\.my-own-world-backupsПоследняя операция: backup.listIncomplete: 3 мс (comp"
  },
  "treeAfterSearch": {
    "renderedItems": 1,
    "scrollTop": 0,
    "scrollHeight": 788,
    "clientHeight": 788,
    "virtualized": false
  },
  "map": {
    "title": "Учебная карта B",
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
  "audioProgress": [
    {
      "phase": "music-popup-open",
      "at": "2026-08-20T12:07:38.452Z"
    },
    {
      "phase": "normal-imported",
      "at": "2026-08-20T12:07:38.575Z"
    },
    {
      "phase": "normal-controls",
      "at": "2026-08-20T12:07:38.954Z"
    },
    {
      "phase": "battle-imported",
      "at": "2026-08-20T12:07:39.091Z"
    },
    {
      "phase": "battle-controls",
      "at": "2026-08-20T12:07:39.437Z"
    },
    {
      "phase": "files-on-disk",
      "at": "2026-08-20T12:07:39.438Z"
    },
    {
      "phase": "map-switch-return",
      "at": "2026-08-20T12:07:39.516Z"
    },
    {
      "phase": "workspace-reloaded",
      "at": "2026-08-20T12:07:40.350Z"
    },
    {
      "phase": "music-popup-open-after-reload",
      "at": "2026-08-20T12:07:40.386Z"
    },
    {
      "phase": "battle-tracks-after-reload",
      "at": "2026-08-20T12:07:40.388Z"
    },
    {
      "phase": "normal-tracks-after-reload",
      "at": "2026-08-20T12:07:40.466Z"
    },
    {
      "phase": "play-after-reload",
      "at": "2026-08-20T12:07:40.496Z"
    }
  ],
  "audio": {
    "mapId": "sample-campaign-map-b",
    "importedFiles": [
      "desktop-normal-a.wav",
      "desktop-normal-b.wav",
      "desktop-battle-a.wav",
      "desktop-battle-b.wav"
    ],
    "normal": {
      "activeMode": "normal",
      "tracks": [
        "desktop normal a",
        "desktop normal b"
      ],
      "playbackStatus": "Остановлено",
      "audioSourceKind": "blob",
      "audioTrackId": "track-f265c084-5b4d-488f-955c-1e666f51d5f4",
      "audioTrackTitle": "desktop normal a",
      "shuffle": true,
      "loop": true
    },
    "battle": {
      "activeMode": "battle",
      "tracks": [
        "desktop battle a",
        "desktop battle b"
      ],
      "playbackStatus": "Остановлено",
      "audioSourceKind": "blob",
      "audioTrackId": "track-93ace771-eef9-4e63-b570-b5959a0c7df7",
      "audioTrackTitle": "desktop battle a",
      "shuffle": true,
      "loop": true
    },
    "mapSwitch": {
      "from": "sample-campaign-map-b",
      "to": "sample-campaign-map",
      "back": "sample-campaign-map-b"
    },
    "reloaded": {
      "activeMode": "normal",
      "tracks": [
        "desktop normal a",
        "desktop normal b"
      ],
      "playbackStatus": "Играет: desktop normal a",
      "audioSourceKind": "blob",
      "audioTrackId": "track-f265c084-5b4d-488f-955c-1e666f51d5f4",
      "audioTrackTitle": "desktop normal a",
      "shuffle": true,
      "loop": true
    }
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

- warning: Workspace schema: schema issues found: 6 [Object, Object, Object, Object, Object, Object]
- warning: Не удалось восстановить состояние дерева из workspace: Error: Не удается найти указанный файл. (os error 2)
    at normalizeTauriCommandError (http://tauri.localhost/js/storage/tauriBridge.js:72:7)
    at invokeTauriCommand (http://tauri.localhost/js/storage/tauriBridge.js:34:13)
    at async restoreWorkspaceTreeExpansionState (http://tauri.localhost/js/tree/tree.js:1700:9)
    at async http://tauri.localhost/js/app.js:255:3
- warning: Workspace schema: schema issues found: 12 [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object]
- warning: Не удалось восстановить состояние дерева из workspace: Error: Не удается найти указанный файл. (os error 2)
    at normalizeTauriCommandError (http://tauri.localhost/js/storage/tauriBridge.js:72:7)
    at invokeTauriCommand (http://tauri.localhost/js/storage/tauriBridge.js:34:13)
    at async restoreWorkspaceTreeExpansionState (http://tauri.localhost/js/tree/tree.js:1700:9)
    at async http://tauri.localhost/js/app.js:255:3
- warning: Workspace schema: schema issues found: 6 [Object, Object, Object, Object, Object, Object]
- warning: Не удалось восстановить состояние дерева из workspace: Error: Не удается найти указанный файл. (os error 2)
    at normalizeTauriCommandError (http://tauri.localhost/js/storage/tauriBridge.js:72:7)
    at invokeTauriCommand (http://tauri.localhost/js/storage/tauriBridge.js:34:13)
    at async restoreWorkspaceTreeExpansionState (http://tauri.localhost/js/tree/tree.js:1700:9)
    at async http://tauri.localhost/js/app.js:255:3

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
- Audio smoke imports temporary WAV files through the map music UI, saves them into `assets/music`, exercises normal/battle controls, switches maps, reloads the workspace and replays the saved playlist.
- It does not create, move or delete workspace pages.
- It sets only `myOwnWorld.desktop.workspaceRoot` in the app WebView localStorage so the desktop adapter can restore the selected workspace.
