---
summary: "Current native desktop click-through report."
read_when:
  - "Before desktop release handoff"
  - "When validating the native Tauri window"
owner_zone: "delivery"
---

# Desktop Native Click-Through Current

Run date: 2026-07-19T17:28:48.894Z

Plan ref: `0.0.1.2.2`

Workspace: `X:\ДНД\Мастер\По кампаниям\База`

Executable: `C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

Status: passed

Fatal error: none

## Steps

- launch native desktop app with WebView2 remote debugging: passed (601 ms)
- restore workspace through desktop adapter: passed (1482 ms)
- open settings workspace diagnostics panel: passed (670 ms)
- scroll and search the large tree: passed (181 ms)
- open heavy campaign map: passed (25 ms)
- open presentation window from the heavy map: passed (984 ms)

## Targets

- 1779484665129-7a321d25 - 321 KB, tokens: 52, shapes: 0, fog markers: 0, file: `1779484665129-7a321d25.md`
- 1779530830476-a9517dfe - 398 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779530830476-a9517dfe.md`
- 1779482139467-a52d5cd6 - 200 KB, tokens: 42, shapes: 0, fog markers: 0, file: `1779482139467-a52d5cd6.md`
- 1779483383627-c77aa6a2 - 203 KB, tokens: 30, shapes: 0, fog markers: 0, file: `1779483383627-c77aa6a2.md`
- 1778954209902-4b0ed25b - 108 KB, tokens: 50, shapes: 0, fog markers: 0, file: `1778954209902-4b0ed25b.md`

## Metrics

```json
{
  "cdpEndpoint": "http://127.0.0.1:58967",
  "workspace": {
    "title": "MyOwnWorld",
    "treeItems": 3,
    "virtualized": false,
    "statusbar": "Пустая страница"
  },
  "diagnostics": {
    "cards": 9,
    "sections": 6,
    "hasWriteProbe": true,
    "textSample": "Desktop workspace statusРежим: desktopWorkspace: \\\\?\\X:\\ДНД\\Мастер\\По кампаниям\\БазаLocation: network folderAccess matrix: Workspace in network folder: matchedЗапись: OKWrite probe: Write probe OK.Схема: OKCheckpoint: Еще не запускалсяBackup: 5 шт., последний: delete-page-branchПапка backup: \\\\?\\X:\\ДНД\\Мастер\\По кампаниям\\База\\.my-own-world-backupsПоследняя операция: backup.listIncomplete: 13 ms (completed)690Страниц25Карт141Ассетов527Broken refs129Orphan refs2074Проблем схемы5Backup0Недособр. b"
  },
  "treeAfterSearch": {
    "renderedItems": 1,
    "scrollTop": 0,
    "scrollHeight": 664,
    "clientHeight": 664,
    "virtualized": false
  },
  "map": {
    "title": "Горы-Пещеры",
    "toolbar": true,
    "stage": true,
    "tokens": 26,
    "shapes": 0,
    "fogCanvas": true,
    "backgroundElement": true
  },
  "presentation": {
    "url": "http://tauri.localhost/presentation.html",
    "map": true,
    "status": "ready",
    "tokens": 18,
    "shapes": 0,
    "fogCanvas": false
  }
}
```

## Console And Page Errors

- warning: Workspace schema: schema issues found: 2074 [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object]

## Resource Issues

- No failed resource responses captured.

## Notes

- The runner uses WebView2 remote debugging to click the real Tauri WebView.
- It does not create, move or delete workspace pages.
- It sets only `myOwnWorld.desktop.workspaceRoot` in the app WebView localStorage so the desktop adapter can restore the selected workspace.
