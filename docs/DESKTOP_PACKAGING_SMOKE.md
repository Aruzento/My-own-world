# Desktop Packaging Smoke

Дата: 02.06.2026

Пункт плана: **20.11 Desktop Packaging Smoke**.

## Цель

Зафиксировать минимальный smoke для desktop-сборки, чтобы переход к packaged-приложению шел контролируемо и не ломал browser-версию.

## Текущее состояние

Desktop-прототип уже компилируется как Tauri backend:

- `npm run desktop:check` проходит;
- `cargo check` в `src-tauri` проходит;
- `npm run desktop:dev` запускает desktop-прототип через dev server;
- `bundle.active` пока `false`, поэтому полноценный installer/release package еще не является обязательным gate.

## Перед packaging

1. Проверить browser:

```powershell
npm run verify
npm run test:browser
```

2. Проверить desktop окружение:

```powershell
npm run desktop:check
cd src-tauri
C:\Users\Aruko\.cargo\bin\cargo.exe check
```

3. Проверить desktop dev:

```powershell
npm run desktop:dev
```

## Packaging Smoke Когда Включим Bundle

1. Включить `bundle.active`.
2. Убедиться, что `frontendDist` указывает на production-ready frontend, а не на сырую папку проекта.
3. Выполнить:

```powershell
npm run desktop:build
```

4. Запустить собранное приложение.
5. Открыть чистый workspace.
6. Создать карточку.
7. Добавить картинку.
8. Открыть карту.
9. Создать backup.
10. Перезапустить приложение.
11. Проверить, что карточка, картинка, карта и backup остались доступны.

## Почему bundle пока не включен

Текущий проект работает как static web app без production bundler. Если прямо сейчас включить packaging, Tauri может забрать слишком много файлов или нестабильно работать с dev-oriented структурой. Перед настоящим installer нужно отдельно подготовить frontend output.

## Следующее развитие

Packaging нужно делать после:

- native/file-safe asset display;
- desktop presentation runtime decision;
- production frontend output;
- release checklist с desktop smoke.
