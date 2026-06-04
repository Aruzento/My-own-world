# Tester Instructions

Текущая папка `release/latest/` подготовлена как место для будущей передачи сборок.

Перед тестом сверяйтесь с:

- `docs/04-user-release/README_FOR_TESTERS.md`;
- `docs/04-user-release/TEST_SCENARIOS.md`;
- `docs/04-user-release/KNOWN_ISSUES.md`.

Для проверки структуры проекта дополнительно:

1. Запустить `npm run docs:index`.
2. Запустить `npm run agents:validate`.
3. Убедиться, что новые markdown-документы не добавлены прямо в корень `docs/`.
