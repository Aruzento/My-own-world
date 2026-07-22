---
summary: "Desktop smoke testing entry point."
read_when:
  - "Before verification"
  - "When adding or changing tests"
owner_zone: "testing"
---
# Desktop Smoke

Этот документ является тестовой точкой входа. Подробные инженерные материалы живут в архитектурной зоне:

- `docs/02-architecture/desktop/DESKTOP_PROTOTYPE_SMOKE.md`;
- `docs/02-architecture/desktop/DESKTOP_BACKUP_RESTORE_GATE.md`;
- `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md`;
- `docs/02-architecture/desktop/DESKTOP_PRESENTATION_WINDOW_SPIKE.md`.

Минимальный тестовый проход:

1. Запустить `npm run desktop:check`.
2. Запустить `npm run desktop:packaging-smoke`.
3. Проверить `npm run desktop:dev`.
4. Открыть workspace.
5. Проверить карточку с картинкой.
6. Проверить карту с фоном и презентацией.
7. Проверить backup/restore.

Для `npm run desktop:dev` допустимо, что браузерный preview уже открыт на `http://127.0.0.1:5173/`: dev-сервер должен переиспользовать живой локальный сервер и не ломать Tauri `beforeDevCommand`.
