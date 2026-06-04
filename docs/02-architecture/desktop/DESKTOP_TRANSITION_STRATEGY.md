---
summary: "architecture document for DESKTOP_TRANSITION_STRATEGY.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Desktop Transition Strategy

Дата обновления: 04.06.2026

Пункт плана: **20.14 Перевод в Desktop-приложение**.

Статус: **desktop foundation закрыт**.

## Решение

Desktop остается основным практическим путем развития My own world после стабилизации local-first ядра.

Причина: проект уже работает с локальным workspace, картами, assets, backup, презентацией и будущими большими медиа. Desktop снимает ограничения браузерного File System Access API и лучше подходит для кампаний мастера.

## Что Уже Закрыто

- Browser mode сохранен.
- Workspace format не изменен.
- Storage идет через `StorageAdapter`.
- Assets идут через `AssetAdapter`.
- Tauri shell создан.
- Workspace picker работает через Tauri dialog bridge.
- Native FS commands читают и пишут внутри workspace root.
- Backup/restore работает через adapter-backed слой.
- Desktop-презентация открывается отдельным Tauri window.
- Презентация перешла на model-first renderer из `CampaignMapModel`.
- Privacy rules презентации закреплены: скрытые non-player сущности не показываются, hidden player/original token остается видимым с badge.
- Production frontend output собирается в `dist-desktop`.
- NSIS installer собирается через `npm run desktop:build`.
- Desktop release policy описана в `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md`.
- Performance foundation карты закрыт: asset URL cache, delta-sync, drag-measure patch, fog patch.

## Текущая Граница Desktop Foundation

Блок 20 не означает, что desktop-приложение уже имеет все будущие возможности. Он означает, что создана инженерная граница, через которую можно развивать desktop без хаотичного переписывания browser-версии.

Минимальный desktop gate:

```bash
npm run verify
npm run test:browser
npm run desktop:packaging-smoke
npm run desktop:check
npm run desktop:build
```

## Что Вынесено В Будущее

Эти задачи не являются хвостами блока 20:

- настоящий Tauri UI click-runner;
- native file picker для image/audio, если WebView input окажется недостаточным;
- audio/playlist assets;
- updater/signing;
- recent workspaces;
- system menu;
- отдельное окно reference card;
- реальные desktop performance measurements из Tauri-окна;
- cloud/backend implementation.

## Что Может Заставить Вернуться к Electron

Tauri остается первым выбором. Electron рассматривать только если:

- WebView ограничит presentation multi-window;
- будут нерешаемые проблемы с canvas/fog/assets;
- потребуются сложные devtools/in-app plugins;
- native file/media APIs окажутся слишком дорогими в Tauri.

## Следующий Практический Фокус После Блока 20

Следующий крупный продуктовый фокус нужно выбирать уже вне desktop foundation:

1. стабильность и тесты вокруг карты;
2. PageRepository / PageIndex;
3. свойства карточек и CharacterModel;
4. Tauri UI runner, если desktop становится основным каналом доставки.
