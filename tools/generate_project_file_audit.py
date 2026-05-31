from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "PROJECT_FILE_AUDIT.md"
EXCLUDED_PARTS = {
    ".git",
    "node_modules",
    "test-results",
    "__pycache__",
}
EXCLUDED_FILES = {
    "debug.log",
}


def iter_project_files():
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue

        relative = path.relative_to(ROOT)
        parts = set(relative.parts)

        if parts & EXCLUDED_PARTS:
            continue

        if relative.name in EXCLUDED_FILES:
            continue

        yield relative


def classify(path):
    path_text = path.as_posix()
    suffix = path.suffix.lower()
    name = path.name

    if path_text.startswith(".github/workflows/"):
        return (
            "Workflow GitHub Actions.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if name in {".gitattributes", ".gitignore"}:
        return (
            "Метаданные и конфигурация репозитория.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if name == "package.json":
        return (
            "NPM-скрипты, тип модулей и метаданные пакета.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if name == "package-lock.json":
        return (
            "Зафиксированное дерево зависимостей для воспроизводимой установки.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if name == "playwright.config.mjs":
        return (
            "Конфигурация браузерных тестов Playwright.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if name == "README.md":
        return (
            "Главная продуктовая и архитектурная документация.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if name == "CHANGELOG.md":
        return (
            "История релизов и пользовательские заметки об изменениях.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("docs/sample-workspace/"):
        return (
            "Пример workspace для onboarding и ручных проверок.",
            "Срочная оптимизация не нужна.",
            "Нет: нужно для onboarding/sample workspace.",
        )

    if path_text.startswith("docs/"):
        optimize = "Срочная оптимизация не нужна."
        if name == "MY_OWN_WORLD_FULL_MANUAL.docx":
            optimize = (
                "Нет: это сгенерированный или пользовательский документ, "
                "не цель для оптимизации кода."
            )

        return (
            "Документация: контракт, план, журнал работ, стратегия или сгенерированный мануал.",
            optimize,
            "Нет.",
        )

    if path_text.startswith("Тех. зрелость/"):
        return (
            "Пользовательские документы по оценке технической зрелости проекта.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("assets/icons/"):
        return (
            "SVG-иконки RPG/fantasy или документация по иконкам.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("assets/"):
        return (
            "Статический визуальный asset.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if name == "index.html":
        return (
            "HTML-каркас приложения и статические корни popup.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("styles/campaign-map"):
        return (
            "CSS-файл зоны ответственности карты кампании.",
            "Да: пересмотреть для дальнейшего разделения CSS-зон ответственности.",
            "Нет.",
        )

    if path_text.startswith("styles/popup") or "popup" in name.lower():
        return (
            "CSS-файл зоны ответственности popup.",
            "Да: пересмотреть для дальнейшего разделения CSS-зон ответственности.",
            "Нет.",
        )

    if path_text.startswith("styles/block"):
        return (
            "CSS-файл зоны ответственности блоков карточки.",
            "Да: пересмотреть для дальнейшего разделения CSS-зон ответственности.",
            "Нет.",
        )

    if path_text.startswith("styles/"):
        return (
            "CSS-файл зоны ответственности приложения.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text == "js/app.js":
        return (
            "Запуск приложения и подключение основных подсистем.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/core/"):
        return (
            "Базовые helpers: markdown и отрисовка иконок.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/repository/"):
        return (
            "PageRepository/PageIndex: поиск и индексы страниц.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/state"):
        return (
            "Глобальное состояние и контролируемые изменения state.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/storage/"):
        return (
            "Хранение, жизненный цикл asset, очередь записи и helpers persistence.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/templates/"):
        return (
            "HTML/template-генераторы сущностей, карточек, карт, блоков и task tracker.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/taskTracker/"):
        return (
            "Самостоятельная подсистема task tracker: модель, рендер, DnD и сохранение.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/tree/"):
        return (
            "Дерево сущностей: рендер, контекстное меню, pointer DnD, расчет drop intent и планирование переносов.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/ui/"):
        return (
            "Переиспользуемый UI-модуль: popup, теги, алиасы, профиль, onboarding, таблицы.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if "knowledgeGraph" in name or "wikiRelation" in name:
        return (
            "Граф знаний, связи, ссылки и helpers wiki-отношений.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/editor/archived/"):
        return (
            "Архивный или экспериментальный слой переменных.",
            "Да: архивный эксперимент, вернуться после PropertiesModel.",
            "Пока нет: архивный эксперимент, удалять только после решения по миграции.",
        )

    if path_text.startswith("js/editor/blocks/"):
        optimize = "Срочная оптимизация не нужна."
        if path.stat().st_size > 12000:
            optimize = "Да: крупный файл, разрезать или добавить контрактную границу."

        return (
            "Контракт блоков карточки: runtime-контролы, popup, фабрика, сериализация и обновления.",
            optimize,
            "Нет.",
        )

    if path_text.startswith("js/editor/campaignMap"):
        optimize = "Да: продолжать разрезать и покрывать regression-тестами."
        if path.stat().st_size < 4500:
            optimize = "Срочная оптимизация не нужна."
        if path.stat().st_size > 16000:
            optimize = "Да: крупный файл, разрезать или добавить контрактную границу."

        return (
            "Подсистема карты: модель, интерфейс, токены, фигуры, туман, слои, презентация и сериализация.",
            optimize,
            "Нет.",
        )

    if path_text.startswith("js/editor/table"):
        return (
            "Подсистема таблиц: строки, ячейки, колонки, resize, выделение, toolbar и clipboard.",
            "Да: крупный файл, разрезать или добавить контрактную границу.",
            "Нет.",
        )

    if path_text.startswith("js/editor/search"):
        return (
            "Поиск по страницам через repository/index.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/editor/title"):
        return (
            "Валидация названий страниц и дублей.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("js/editor/"):
        optimize = "Срочная оптимизация не нужна."
        if path.stat().st_size > 12000:
            optimize = "Да: крупный файл, разрезать или добавить контрактную границу."

        return (
            "Подсистема редактора карточек: открытие, сохранение, toolbar, wiki-ссылки, вставка, история, sanitizer и изображения.",
            optimize,
            "Нет.",
        )

    if path_text.startswith("tests/browser/"):
        optimize = "Срочная оптимизация не нужна."
        if path.stat().st_size > 12000:
            optimize = "Да: крупный файл, разрезать или добавить контрактную границу."

        return (
            "Браузерный smoke/regression-сценарий.",
            optimize,
            "Нет.",
        )

    if path_text.startswith("tests/"):
        return (
            "Unit/model regression-тест.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if path_text.startswith("tools/"):
        return (
            "Инструмент разработки: проверки, статический сервер, browser runner или генерация документации.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    if suffix in {".png", ".jpg", ".jpeg", ".webp", ".svg"}:
        return (
            "Статический визуальный asset.",
            "Срочная оптимизация не нужна.",
            "Нет.",
        )

    return (
        "Вспомогательный файл проекта.",
        "Срочная оптимизация не нужна.",
        "Нет.",
    )


def main():
    files = list(iter_project_files())
    lines = [
        "# Аудит файлов проекта",
        "",
        "Дата: 31.05.2026",
        "",
        "Исключены: `.git/`, `node_modules/`, `test-results/`, локальный `debug.log`.",
        "",
        f"Всего файлов в аудите: {len(files)}.",
        "",
        "| Название файла | За что отвечает | Нужно ли его оптимизировать | Можно ли удалить? |",
        "|---|---|---|---|",
    ]

    for relative in files:
        responsibility, optimize, delete = classify(relative)
        path = relative.as_posix()
        lines.append(
            f"| `{path}` | {responsibility} | {optimize} | {delete} |"
        )

    OUTPUT.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8"
    )


if __name__ == "__main__":
    main()
