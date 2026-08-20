---
summary: "Current native desktop click-through report."
read_when:
  - "Before desktop release handoff"
  - "When validating the native Tauri window"
owner_zone: "delivery"
---

# Desktop Native Click-Through Current

Run date: 2026-08-20T10:47:32.092Z

Plan ref: `0.0.1.11.4` (runner introduced in `0.0.1.2.2`)

Workspace: `X:\ДНД\Мастер\По кампаниям\База`

Executable: `C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

Status: passed

Fatal error: none

## Steps

- launch native desktop app with WebView2 remote debugging: passed (2465 ms)
- restore workspace through desktop adapter: passed (2336 ms)
- open representative card: passed (165 ms)
- open settings workspace diagnostics panel: passed (718 ms)
- scroll and search the large tree: passed (181 ms)
- open heavy campaign map: passed (36 ms)
- open presentation window from the heavy map: passed (1328 ms)

## Targets

### Representative Cards

- Бард - 81 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779025687397-dccd5ae9.md`
- Лазарь - 48 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1778774862407.md`
- Азраэль - 47 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1778826483996.md`
- Лазарь - сущность.Сокровищница - 43 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779501234651-de43db7a.md`
- Лазарь - сущность.Лес-Начало - 43 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779369617396-9ae3d032.md`
- Существо9.Лес-Развилка - 43 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779482057316-7aa0d2c8.md`
- Существо3.Горы-Начало - 43 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779484250649-8194d882.md`
- Существо3.Лес-Река - 43 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779482216210-4f0d97ff.md`
- Существо3.Старт - 43 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779395572811-539b13f1.md`
- Существо3.Горы2 - 43 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779487035956-c5169230.md`
- Громм Кровавый горн - 40 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1778873750754-81facd25.md`
- Мистический ловкач - 39 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779043011224-fc39d003.md`

### Heavy Maps

- Горы-Пещеры - 321 KB, tokens: 52, shapes: 0, fog markers: 0, file: `1779484665129-7a321d25.md`
- Новая карта - 398 KB, tokens: 0, shapes: 0, fog markers: 0, file: `1779530830476-a9517dfe.md`
- Лес-Река - 200 KB, tokens: 42, shapes: 0, fog markers: 0, file: `1779482139467-a52d5cd6.md`
- Горы-Начало - 203 KB, tokens: 30, shapes: 0, fog markers: 0, file: `1779483383627-c77aa6a2.md`
- Деревня-остров - 108 KB, tokens: 50, shapes: 0, fog markers: 0, file: `1778954209902-4b0ed25b.md`

## Metrics

```json
{
  "cdpEndpoint": "http://127.0.0.1:59651",
  "workspace": {
    "title": "MyOwnWorld",
    "treeItems": 10,
    "virtualized": false,
    "statusbar": "Пустая страница"
  },
  "card": {
    "currentPageId": "efeebe4f-f6b6-4d23-9473-fcb09a7a35f3",
    "title": "Бард",
    "hasCardShell": true,
    "textLength": 25810,
    "statusbar": "Пустая страница",
    "searchQuery": "Бард",
    "attemptedTargets": 1
  },
  "diagnostics": {
    "cards": 9,
    "sections": 6,
    "hasWriteProbe": true,
    "textSample": "Desktop workspace statusРежим: desktopWorkspace: \\\\?\\X:\\ДНД\\Мастер\\По кампаниям\\БазаLocation: network folderAccess matrix: Workspace in network folder: matchedЗапись: OKWrite probe: Write probe OK.Схема: OKCheckpoint: Еще не запускалсяBackup: 5 шт., последний: delete-page-branchПапка backup: \\\\?\\X:\\ДНД\\Мастер\\По кампаниям\\База\\.my-own-world-backupsПоследняя операция: backup.listIncomplete: 14 ms (completed)697Страниц27Карт144Ассетов528Broken refs132Orphan refs2055Проблем схемы5Backup0Недособр. b"
  },
  "treeAfterSearch": {
    "renderedItems": 10,
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

- warning: Workspace schema: schema issues found: 2055 [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object]
- warning: Workspace schema: schema issues found: 2055 [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object]

## Unexpected Runtime Errors

- No unexpected runtime errors captured.

## Allowlisted Runtime Events

- No allowlisted runtime events captured.

## Resource Issues

- No failed resource responses captured.

## Notes

- The runner uses WebView2 remote debugging to click the real Tauri WebView.
- It opens one representative card, then Settings diagnostics, tree search, a heavy map and presentation mode.
- It does not create, move or delete workspace pages.
- It sets only `myOwnWorld.desktop.workspaceRoot` in the app WebView localStorage so the desktop adapter can restore the selected workspace.
