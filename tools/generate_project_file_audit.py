from datetime import date
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
    # Обходит только файлы проекта, исключая временные и тяжелые служебные папки.
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue

        relative = path.relative_to(ROOT)
        if set(relative.parts) & EXCLUDED_PARTS:
            continue

        if relative.name in EXCLUDED_FILES:
            continue

        yield relative


def classify(path):
    # Возвращает понятное описание файла для ручного аудита проекта.
    path_text = path.as_posix()
    suffix = path.suffix.lower()
    name = path.name

    if path_text.startswith(".github/workflows/"):
        return (
            "Workflow GitHub Actions для проверки проекта.",
            "Нет: файл короткий и выполняет инфраструктурную роль.",
            "Нет.",
        )

    if name in {".gitattributes", ".gitignore"}:
        return (
            "Настройки репозитория и правил хранения файлов.",
            "Нет: менять только при изменении политики репозитория.",
            "Нет.",
        )

    if name == "package.json":
        return (
            "NPM-скрипты, тип модулей и метаданные проекта.",
            "Нет: поддерживать актуальные scripts и version.",
            "Нет.",
        )

    if name == "package-lock.json":
        return (
            "Зафиксированное дерево зависимостей для воспроизводимой установки.",
            "Нет: обновлять только вместе с зависимостями.",
            "Нет.",
        )

    if name == "playwright.config.mjs":
        return (
            "Конфигурация браузерных тестов Playwright.",
            "Нет: расширять при росте browser regression.",
            "Нет.",
        )

    if name == "README.md":
        return (
            "Главная продуктовая и архитектурная документация.",
            "Да: держать синхронно с крупными изменениями.",
            "Нет.",
        )

    if name == "CHANGELOG.md":
        return (
            "История релизов и пользовательские заметки об изменениях.",
            "Нет: пополнять при релизах.",
            "Нет.",
        )

    if path_text.startswith("docs/sample-workspace/"):
        return (
            "Пример workspace для onboarding и ручных проверок.",
            "Нет: обновлять только при изменении демонстрационных сценариев.",
            "Нет.",
        )

    if path_text.startswith("docs/archive/"):
        return (
            "Архивный снимок старой документации или плана, сохраненный для истории.",
            "Нет: не обновлять, актуальные правки вносить в живые документы.",
            "Нет: хранить как исторический архив.",
        )

    if path_text.startswith("docs/"):
        return (
            "Документация, контракт, план, аудит, журнал работ или сгенерированный мануал.",
            "Да: проверять актуальность после крупных изменений.",
            "Нет.",
        )

    if path_text.startswith("Тех. зрелость/"):
        return (
            "Материалы и результаты оценки технической зрелости проекта.",
            "Нет: хранить как исторические снимки зрелости.",
            "Нет.",
        )

    if path_text.startswith("assets/icons/"):
        return (
            "SVG-иконки RPG/fantasy интерфейса.",
            "Нет: оптимизировать только при росте sprite или проблемах отрисовки.",
            "Нет.",
        )

    if path_text.startswith("assets/"):
        return (
            "Статический визуальный asset приложения.",
            "Нет: проверять размер и использование через asset lifecycle.",
            "Нет.",
        )

    if path_text.startswith("styles/"):
        return classify_style_file(path)

    if path_text.startswith("tests/browser/"):
        return (
            "Браузерный regression/smoke тест пользовательского сценария.",
            "Нет: расширять покрытие при новых функциях.",
            "Нет.",
        )

    if path_text.startswith("tests/"):
        return (
            "Unit-тест модели, контракта или helper-функции.",
            "Нет: расширять при изменении соответствующей подсистемы.",
            "Нет.",
        )

    if path_text.startswith("tools/"):
        return (
            "Служебный инструмент проекта: проверки, сервер, генерация документации или аудита.",
            "Нет: держать простым и покрывать ручной проверкой результата.",
            "Нет.",
        )

    if path_text.startswith("js/editor/campaignMap"):
        return (
            "Подсистема карты кампании: модель, рендер, токены, фигуры, туман, слои, инициатива или презентация.",
            "Да: продолжать дробить крупные участки и усиливать тестами производительности.",
            "Нет.",
        )

    if path_text.startswith("js/taskTracker/"):
        return (
            "Самостоятельная подсистема таск-трекера: модель, рендер, DnD и сериализация.",
            "Нет срочно: развивать model-first и добавлять функции задач.",
            "Нет.",
        )

    if path_text.startswith("js/repository/"):
        return (
            "PageRepository / PageIndex для поиска, связей, дублей и parent-chain.",
            "Нет: ключевой слой архитектуры, расширять через API.",
            "Нет.",
        )

    if path_text.startswith("js/storage/"):
        return (
            "Слой хранения workspace, страниц, assets и очереди записи.",
            "Да: следующий рост связан с backup, schema validation и adapter boundary.",
            "Нет.",
        )

    if path_text.startswith("js/tree/"):
        return (
            "Дерево сущностей: рендер, контекстное меню, pointer DnD и расчет переносов.",
            "Нет срочно: поддерживать regression-тестами при изменениях.",
            "Нет.",
        )

    if path_text.startswith("js/ui/tables"):
        return (
            "Подсистема таблиц: выделение, resize, toolbar, строки, колонки и clipboard.",
            "Да: укрепить контракт таблиц и расширить тесты.",
            "Нет.",
        )

    if path_text.startswith("js/ui/"):
        return (
            "UI-поведение карточек и общих компонентов: теги, aliases, popup, таблицы, профайл, блоки.",
            "Да: постепенно дробить крупные файлы и унифицировать popup/UI contract.",
            "Нет.",
        )

    if path_text.startswith("js/templates/"):
        return (
            "Генераторы persistent HTML карточек, блоков, карт, таск-трекера и шаблонов.",
            "Да: следить, чтобы templates не содержали runtime-логику.",
            "Нет.",
        )

    if path_text.startswith("js/wiki/"):
        return (
            "Knowledge graph, backlinks и связи wiki-страниц.",
            "Нет срочно: развивать после стабилизации PageRepository.",
            "Нет.",
        )

    if path_text.startswith("js/"):
        return (
            "JavaScript-модуль приложения.",
            "Проверить при росте файла: стремиться к маленьким модулям с ясной ответственностью.",
            "Нет.",
        )

    if suffix in {".html", ".css", ".md", ".mjs", ".js", ".py", ".json", ".svg"}:
        return (
            "Файл приложения или инфраструктуры проекта.",
            "Проверять при изменении соответствующей зоны ответственности.",
            "Нет.",
        )

    return (
        "Файл проекта.",
        "Проверить вручную при следующем аудите.",
        "Нет без отдельного решения.",
    )


def classify_style_file(path):
    path_text = path.as_posix()
    if "campaign-map" in path_text:
        return (
            "CSS карты кампании: layout, toolbar, токены, фигуры, туман, слои или презентация.",
            "Да: продолжать разделение CSS по зонам ответственности.",
            "Нет.",
        )

    if "popup" in path_text:
        return (
            "CSS popup-компонентов.",
            "Да: развивать общий popup/UI contract.",
            "Нет.",
        )

    return (
        "CSS интерфейса приложения.",
        "Проверять на дубли и соответствие UI component contract.",
        "Нет.",
    )


def markdown_escape(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def main():
    files = list(iter_project_files())
    lines = [
        "# Аудит файлов проекта",
        "",
        f"Дата: {date.today().strftime('%d.%m.%Y')}",
        "",
        "Исключены: `.git/`, `node_modules/`, `test-results/`, локальный `debug.log`.",
        "",
        f"Всего файлов в аудите: {len(files)}.",
        "",
        "| Название файла | За что отвечает | Нужно ли его оптимизировать | Можно ли удалить? |",
        "|---|---|---|---|",
    ]

    for relative in files:
        responsibility, optimize, removable = classify(relative)
        lines.append(
            "| `{}` | {} | {} | {} |".format(
                markdown_escape(relative.as_posix()),
                markdown_escape(responsibility),
                markdown_escape(optimize),
                markdown_escape(removable),
            )
        )

    lines.extend(
        [
            "",
            "## Вывод",
            "",
            "Проект уже разделен на несколько самостоятельных подсистем: карточки, карта кампании, таск-трекер, дерево, wiki-связи, storage и тестовая инфраструктура.",
            "Главные зоны для дальнейшей оптимизации: карта кампании при большом количестве объектов, таблицы, старые крупные CSS/JS-файлы, storage lifecycle и документация, которая должна обновляться после крупных изменений.",
        ]
    )

    OUTPUT.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
