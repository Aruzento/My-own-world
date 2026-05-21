from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
import re
import zipfile


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'MY_OWN_WORLD_FULL_MANUAL.docx'
EXTS = {'.js', '.css', '.html', '.md', '.svg', '.py'}
NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
SKIP_DIRS = {
    '.git',
    'node_modules',
    'test-results',
    'playwright-report'
}


def xml(value):
    return escape(str(value), {'"': '&quot;'})


def paragraph(text='', style=None):
    style_xml = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ''
    return f'<w:p>{style_xml}<w:r><w:t xml:space="preserve">{xml(text)}</w:t></w:r></w:p>'


def code_paragraph(text=''):
    return (
        '<w:p><w:pPr><w:pStyle w:val="Code"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>'
        '<w:sz w:val="17"/></w:rPr>'
        f'<w:t xml:space="preserve">{xml(text)}</w:t></w:r></w:p>'
    )


def bullet(text):
    return paragraph('• ' + text)


def page_break():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def collect_files():
    result = []

    for path in sorted(ROOT.rglob('*')):
        if not path.is_file():
            continue

        if any(part in SKIP_DIRS for part in path.parts):
            continue

        if path == OUT:
            continue

        if path.suffix.lower() in EXTS:
            result.append((path.relative_to(ROOT).as_posix(), path))

    return result


def read_lines(path):
    return path.read_text(encoding='utf-8', errors='replace').splitlines()


def file_role(rel):
    if rel == 'index.html':
        return 'HTML-каркас приложения: задаёт контейнеры интерфейса, подключает стили и главный JS-модуль.'
    if rel == 'README.md':
        return 'Главная документация проекта: назначение, архитектура, правила и пользовательские инструкции.'
    if rel.startswith('docs/'):
        return 'Документация проекта: архитектурные решения, планы, техдолг или сценарии проверки.'
    if rel.startswith('tools/'):
        return 'Служебный инструмент проекта: помогает поддерживать документацию или рабочие процессы.'
    if rel.startswith('styles/'):
        return 'CSS-файл: внешний вид, размеры, цвета, состояния и адаптивность интерфейса.'
    if rel == 'js/app.js':
        return 'Главная точка запуска JS: связывает workspace, дерево, редактор, поиск, карточки и UI.'
    if rel.startswith('js/editor/campaignMap'):
        return 'Подсистема карты кампании: фон, viewport, grid, fog, tokens, shapes, сохранение и презентация.'
    if rel.startswith('js/editor/blocks/'):
        return 'Подсистема блоков карточки: контракт, создание, popup, runtime-контролы и clean-save правила.'
    if rel.startswith('js/editor/wiki'):
        return 'Подсистема wiki-ссылок: поиск целей, DOM-ссылки, превью, нормализация и создание новых карточек.'
    if rel.startswith('js/editor/'):
        return 'Редактор карточек: открытие страниц, contenteditable, toolbar, изображения, таблицы, hotkeys и сохранение.'
    if rel.startswith('js/tree/'):
        return 'Дерево страниц: иерархия, drag-and-drop, контекстное меню, клавиши и состояние свёрнутых веток.'
    if rel.startswith('js/storage/'):
        return 'Слой хранения: File System Access API, markdown, assets, workspace и очередь записи.'
    if rel.startswith('js/ui/'):
        return 'UI-подсистема: popup, теги, aliases, профиль, типы карточек, item sets, таблицы и DnD-блоки.'
    if rel.startswith('js/templates/'):
        return 'Шаблоны persistent HTML: начальная разметка карточек, блоков и карты.'
    if rel.startswith('js/core/'):
        return 'Базовые утилиты ядра: markdown-преобразование, иконки и общие функции.'
    if rel.startswith('js/search/'):
        return 'Поиск и фильтрация страниц.'
    if rel.startswith('js/wiki/'):
        return 'Подсчёт и хранение связей wiki-ссылок между карточками.'
    if rel.startswith('assets/'):
        return 'Ассет проекта: изображение, SVG или описание ресурсов интерфейса.'

    return 'Файл проекта: участвует в работе приложения, документации или инструментов.'


def function_catalog(lines):
    patterns = [
        re.compile(r'^\s*export\s+async\s+function\s+([A-Za-z0-9_$]+)\s*\('),
        re.compile(r'^\s*export\s+function\s+([A-Za-z0-9_$]+)\s*\('),
        re.compile(r'^\s*async\s+function\s+([A-Za-z0-9_$]+)\s*\('),
        re.compile(r'^\s*function\s+([A-Za-z0-9_$]+)\s*\('),
        re.compile(r'^\s*export\s+class\s+([A-Za-z0-9_$]+)'),
        re.compile(r'^\s*class\s+([A-Za-z0-9_$]+)'),
        re.compile(r'^\s*(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>'),
    ]
    result = []

    for number, line in enumerate(lines, 1):
        for pattern in patterns:
            match = pattern.search(line)
            if match:
                result.append((number, match.group(1), line.strip()))
                break

    return result


def describe_name(name):
    words = re.sub(r'([a-zа-я])([A-ZА-Я])', r'\1 \2', name).replace('_', ' ').replace('-', ' ').lower()
    hints = []

    checks = [
        (['setup', 'init'], 'настраивает обработчики или стартовое состояние'),
        (['render', 'draw'], 'рисует или обновляет DOM-представление'),
        (['save', 'persist', 'write'], 'сохраняет данные в файл, DOM или модель'),
        (['load', 'restore', 'read'], 'читает или восстанавливает состояние'),
        (['open', 'show'], 'открывает окно, popup или страницу'),
        (['close', 'hide'], 'закрывает или скрывает UI'),
        (['handle'], 'обрабатывает событие пользователя или браузера'),
        (['create', 'build'], 'создаёт DOM, HTML или объект данных'),
        (['update', 'sync', 'refresh'], 'синхронизирует уже существующее состояние'),
        (['get', 'find'], 'возвращает найденное значение без побочного эффекта'),
        (['remove', 'delete', 'clear'], 'удаляет данные, классы или временное состояние'),
        (['drag', 'drop', 'resize', 'rotate', 'move'], 'отвечает за интерактивное перемещение или изменение размера'),
    ]

    for keys, text in checks:
        if any(key in words for key in keys):
            hints.append(text)

    return '; '.join(hints) or 'инкапсулирует отдельное действие, названное в имени функции'


def explain_js(line):
    s = line.strip()
    if s == '':
        return 'Пустая строка: визуально разделяет логические блоки кода.'
    if s.startswith('//'):
        return 'Однострочный комментарий: поясняет намерение кода; браузер его не выполняет.'
    if s.startswith('/*') or s.startswith('*') or s.endswith('*/'):
        return 'Многострочный комментарий или его часть: документация внутри кода, не влияет на выполнение.'
    if s.startswith('import '):
        return 'Импорт: подключает функции, классы или значения из другого модуля.'
    if s.startswith('export '):
        return 'Экспорт: делает функцию, класс или значение доступными другим файлам.'
    if re.search(r'\bconst\b', s):
        return 'const: переменная-ссылка, которую нельзя переназначить. Объект внутри всё ещё может изменяться.'
    if re.search(r'\blet\b', s):
        return 'let: переменная, значение которой можно переназначать внутри текущей области видимости.'
    if re.search(r'\bvar\b', s):
        return 'var: старый способ объявить переменную; в современном коде чаще используют let/const.'
    if 'async function' in s:
        return 'Асинхронная функция: может использовать await для чтения файлов, сохранения или других долгих операций.'
    if 'function ' in s:
        return 'Объявление функции: именованный блок кода, который можно вызвать позже.'
    if '=>' in s:
        return 'Стрелочная функция: короткая форма функции, часто используется как callback.'
    if s.startswith(('if ', 'if(', 'if (')):
        return 'if: условие. Блок выполнится только если выражение внутри скобок истинно.'
    if s.startswith('else'):
        return 'else: альтернативная ветка, если предыдущее условие не выполнилось.'
    if s.startswith(('for ', 'for(', 'for (')):
        return 'for: цикл, который повторяет блок кода несколько раз.'
    if '.forEach' in s:
        return 'forEach: перебирает элементы массива или NodeList и выполняет callback для каждого.'
    if '.map' in s:
        return 'map: создаёт новый массив, преобразуя каждый элемент исходного массива.'
    if '.filter' in s:
        return 'filter: оставляет только элементы, которые прошли проверку.'
    if '.find' in s:
        return 'find: возвращает первый элемент массива, подходящий под условие.'
    if '.sort' in s:
        return 'sort: сортирует массив, например страницы или результаты поиска.'
    if 'addEventListener' in s:
        return 'addEventListener: подписка на событие браузера, например click, input, dragover или drop.'
    if 'querySelectorAll' in s:
        return 'querySelectorAll: ищет все DOM-элементы по CSS-селектору.'
    if 'querySelector' in s:
        return 'querySelector: ищет первый DOM-элемент по CSS-селектору.'
    if 'closest' in s:
        return 'closest: ищет ближайшего родителя элемента, подходящего под CSS-селектор.'
    if '.classList.add' in s:
        return 'classList.add: добавляет CSS-класс и включает визуальное/логическое состояние.'
    if '.classList.remove' in s:
        return 'classList.remove: убирает CSS-класс и отключает состояние.'
    if '.classList.toggle' in s:
        return 'classList.toggle: включает или выключает CSS-класс.'
    if '.dataset' in s:
        return 'dataset: чтение/запись data-* атрибутов DOM-элемента, где проект хранит координаты, id и режимы.'
    if 'await ' in s:
        return 'await: ожидание Promise. Следующая строка выполнится после завершения асинхронной операции.'
    if 'return' in s:
        return 'return: завершает функцию и возвращает значение вызывающему коду.'
    if s == 'try' or s.startswith('try '):
        return 'try: начало блока, где возможна ошибка. Ошибка будет обработана в catch.'
    if s.startswith('catch'):
        return 'catch: обработка ошибки, чтобы приложение не падало молча.'
    if 'throw ' in s:
        return 'throw: вручную создаёт ошибку, когда продолжать работу нельзя.'
    if 'new ' in s:
        return 'new: создаёт экземпляр класса или встроенного объекта.'
    if 'document.createElement' in s:
        return 'createElement: создаёт DOM-элемент программно.'
    if '.appendChild' in s or '.append(' in s:
        return 'append/appendChild: вставляет DOM-элемент внутрь другого.'
    if '.remove()' in s:
        return 'remove: удаляет DOM-элемент со страницы.'
    if 'innerHTML' in s:
        return 'innerHTML: читает или записывает HTML. Мощно, но требует clean-save контроля.'
    if 'textContent' in s:
        return 'textContent: читает или задаёт обычный текст без HTML.'
    if 'localStorage' in s:
        return 'localStorage: маленькое браузерное хранилище для UI-настроек.'
    if 'crypto.randomUUID' in s:
        return 'crypto.randomUUID: создаёт уникальный идентификатор.'
    if re.match(r'^[{});,]+$', s):
        return 'Служебная строка синтаксиса: закрывает блок, вызов функции, массив или объект.'
    if s.startswith('{') or s.startswith('}') or s.endswith('{'):
        return 'Фигурная скобка: открывает или закрывает блок кода, объект или область действия.'
    return 'Рабочая строка JS: участвует в вычислении, настройке объекта, передаче параметров или вызове функции.'


def explain_css(line):
    s = line.strip()
    if s == '':
        return 'Пустая строка: отделяет группы CSS-правил.'
    if s.startswith('/*') or s.startswith('*') or s.endswith('*/'):
        return 'CSS-комментарий: поясняет стили, браузер его игнорирует.'
    if s.startswith('@import'):
        return 'CSS import: подключает другой файл стилей.'
    if s.startswith('@media'):
        return 'Media query: правила внутри применяются только при определённых условиях экрана.'
    if s.endswith('{'):
        return 'CSS-селектор: выбирает элементы, к которым применяются свойства.'
    if s == '}':
        return 'Закрывающая скобка CSS-блока.'
    if ':' in s:
        return 'CSS-свойство: слева имя свойства, справа значение, влияющее на внешний вид или поведение.'
    return 'Строка CSS: часть селектора, значения или продолжения многострочного свойства.'


def explain_html(line):
    s = line.strip()
    if s == '':
        return 'Пустая строка: делает HTML-разметку читаемой.'
    if s.startswith('<!--'):
        return 'HTML-комментарий: пояснение для разработчика, не отображается пользователю.'
    if s.startswith('<!DOCTYPE'):
        return 'DOCTYPE: сообщает браузеру, что используется современный HTML5.'
    if s.startswith('<script'):
        return 'script: подключает JavaScript-модуль.'
    if s.startswith('<link'):
        return 'link: подключает внешний ресурс, чаще всего CSS.'
    if s.startswith('<meta'):
        return 'meta: служебная настройка страницы, например UTF-8 или viewport.'
    if s.startswith('</'):
        return 'Закрывающий HTML-тег.'
    if s.startswith('<'):
        return 'HTML-тег: создаёт элемент интерфейса или контейнер.'
    return 'Текстовая строка HTML: содержимое или подпись.'


def explain_md(line):
    s = line.strip()
    if s == '':
        return 'Пустая строка Markdown: разделяет абзацы.'
    if s.startswith('#'):
        return 'Заголовок Markdown: количество # задаёт уровень раздела.'
    if s.startswith(('- ', '* ')):
        return 'Пункт списка Markdown.'
    if s.startswith('```'):
        return 'Граница блока кода Markdown.'
    if s.startswith('|') and '|' in s:
        return 'Строка таблицы Markdown.'
    return 'Обычный текст Markdown: пояснение, правило или инструкция.'


def explain_svg(line):
    s = line.strip()
    if s == '':
        return 'Пустая строка SVG: разделяет части векторной разметки.'
    if s.startswith('<svg'):
        return 'Корневой тег SVG: задаёт область векторной графики.'
    if s.startswith('<path'):
        return 'path: векторный контур; атрибут d описывает команды рисования.'
    if s.startswith('<symbol'):
        return 'symbol: переиспользуемый SVG-фрагмент, например иконка.'
    if s.startswith('<use'):
        return 'use: вставляет ранее описанный symbol.'
    if s.startswith('</'):
        return 'Закрывающий SVG-тег.'
    if s.startswith('<'):
        return 'SVG-тег: описывает фигуру, группу или служебный элемент.'
    return 'Строка SVG: часть векторного описания.'


def explain_py(line):
    s = line.strip()
    if s == '':
        return 'Пустая строка Python: отделяет логические блоки.'
    if s.startswith('#'):
        return 'Комментарий Python: поясняет код и не выполняется.'
    if s.startswith(('import ', 'from ')):
        return 'Импорт Python: подключает стандартный модуль или функцию.'
    if s.startswith('def '):
        return 'Функция Python: именованный блок кода для повторного использования.'
    if s.startswith('if '):
        return 'Условие Python: выполняет вложенный блок только при истинном выражении.'
    if s.startswith('for '):
        return 'Цикл Python: перебирает элементы последовательности.'
    if 'return' in s:
        return 'return Python: возвращает значение из функции.'
    return 'Рабочая строка Python: участвует в генерации документации или обработке данных.'


def explain_line(rel, line):
    ext = Path(rel).suffix.lower()
    if ext == '.js':
        return explain_js(line)
    if ext == '.css':
        return explain_css(line)
    if ext == '.html':
        return explain_html(line)
    if ext == '.md':
        return explain_md(line)
    if ext == '.svg':
        return explain_svg(line)
    if ext == '.py':
        return explain_py(line)
    return 'Строка файла проекта: смысл зависит от формата и соседних строк.'


def build_document(files):
    parts = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', f'<w:document xmlns:w="{NS}"><w:body>']
    total_lines = sum(len(read_lines(path)) for _, path in files)

    parts.append(paragraph('MyOwnWorld: полный технический мануал проекта', 'Title'))
    parts.append(paragraph(f'Сгенерировано: {datetime.now().strftime("%Y-%m-%d %H:%M")}', 'Subtitle'))
    parts.append(paragraph('Документ объясняет проект как учебник: общая архитектура, базовый синтаксис JavaScript, взаимодействия подсистем, каталог функций и построчный разбор каждого файла.'))
    parts.append(paragraph('Важно: при изменении функций этот мануал нужно обновлять вместе с кодом, а в чат писать, какие разделы изменились.', 'IntenseQuote'))

    parts.append(paragraph('1. Как читать этот мануал', 'Heading1'))
    for text in [
        'Сначала прочитайте архитектурные разделы: они дают карту проекта.',
        'Затем откройте нужный файл в построчном разборе: каждая строка имеет номер, код и объяснение.',
        'DOM (Document Object Model) — дерево HTML-элементов страницы, с которым работает JavaScript.',
        'runtime UI — кнопки и панели, нужные в браузере, но не сохраняемые в карточку.',
        'persistent HTML — содержимое карточки, которое должно попасть в .md файл.'
    ]:
        parts.append(bullet(text))

    parts.append(paragraph('2. Карта проекта', 'Heading1'))
    parts.append(paragraph(f'Включено файлов: {len(files)}. Разобрано строк: {total_lines}.'))
    for rel, path in files:
        parts.append(bullet(f'{rel} — {len(read_lines(path))} строк. {file_role(rel)}'))

    parts.append(paragraph('3. Архитектура простыми словами', 'Heading1'))
    sections = [
        ('Запуск приложения', 'index.html создаёт sidebar, editor и popup-контейнеры. js/app.js подключает workspace, дерево, редактор, поиск, карточки, карту, таблицы и специализированные блоки.'),
        ('Данные страниц', 'state.pages хранит страницы. У страницы есть id, title, type, tags, parent и content. parent строит дерево, content хранит HTML карточки или карты.'),
        ('Редактор', 'editor.js открывает страницу, вставляет HTML, запускает render-подсистемы и сохраняет изменения. autosave очищает runtime UI перед записью.'),
        ('Блоки', 'templates/blockTypes.js создаёт persistent HTML. editor/blocks/* добавляет контракт, popup и runtime-контролы. UI-модули добавляют поведение.'),
        ('Wiki-ссылки', 'wikiLink*.js поддерживают [[ссылки]], aliases, превью и нормализацию DOM. Видимый текст пользователя не перезаписывается.'),
        ('Дерево', 'tree/* рисует иерархию, хранит свёрнутые ветки, обрабатывает drag-and-drop и контекстное меню.'),
        ('Карта кампании', 'campaignMap*.js управляет фоном, viewport, grid, fog, tokens, shapes, presentation sync и сохранением. Карточки на карту добавляются как дубли.'),
        ('Стили', 'styles/main.css импортирует все CSS. variables.css задаёт тёмную тему, остальные файлы отвечают за отдельные зоны UI.'),
    ]
    for title, text in sections:
        parts.append(paragraph(title, 'Heading2'))
        parts.append(paragraph(text))

    parts.append(paragraph('4. Мини-учебник JavaScript по проекту', 'Heading1'))
    primer = [
        ('import/export', 'Модульная система: import подключает код, export делает код доступным другим файлам.'),
        ('const/let', 'const нельзя переназначить, let можно. В проекте const чаще для ссылок на элементы, let для изменяемого состояния.'),
        ('function/=>', 'function создаёт именованную функцию, стрелка => часто используется для коротких callback-ов.'),
        ('async/await', 'Позволяют ждать чтение файлов, сохранение, загрузку assets и другие асинхронные действия.'),
        ('DOM', 'querySelector ищет элементы, classList меняет классы, dataset хранит data-* значения.'),
        ('События', 'addEventListener подписывает код на действия пользователя: click, input, pointerdown, dragover, drop.'),
        ('innerHTML', 'Позволяет вставлять HTML строкой. Удобно, но требует clean-save, чтобы runtime UI не попал в сохранённый файл.'),
    ]
    for term, text in primer:
        parts.append(paragraph(term, 'Heading2'))
        parts.append(paragraph(text))

    parts.append(paragraph('5. Основные взаимодействия', 'Heading1'))
    flows = [
        ('Создание карточки', 'Кнопка + → createModal → templates → storage создаёт page → state.pages обновляется → renderTree → openPage.'),
        ('Сохранение', 'input/contenteditable → autosave/editor → clone DOM → очистка runtime → синхронизация form values → запись .md.'),
        ('Добавление блока', 'block popup → blockFactory/template → DOM block → blockControls → специализированный UI render → save.'),
        ('Wiki-link', '[[текст]] → normalizer → lookup по title/aliases → DOM-ссылка → preview.'),
        ('Карта через +', 'toolbar picker → duplicatePageAsChild → addMapToken → model/DOM → saveAndSync.'),
        ('Карта через drag из дерева', 'tree drag state → campaignMapExternalDrop → проверка типа → дубль в Существа/Объекты → токен в точке drop → save.'),
        ('Презентация', 'openPresentationWindow → syncPresentation → отдельное окно без UI → live/full sync.'),
    ]
    for title, text in flows:
        parts.append(paragraph(title, 'Heading2'))
        parts.append(paragraph(text))

    parts.append(page_break())
    parts.append(paragraph('6. Каталог функций и файлов', 'Heading1'))
    for rel, path in files:
        lines = read_lines(path)
        funcs = function_catalog(lines) if rel.endswith(('.js', '.py')) else []
        parts.append(paragraph(rel, 'Heading3' if rel.count('/') <= 1 else 'Heading4'))
        parts.append(paragraph(file_role(rel)))
        if funcs:
            for line_number, name, signature in funcs:
                parts.append(bullet(f'Строка {line_number}: {name} — {describe_name(name)}. Сигнатура: {signature}'))
        elif rel.endswith(('.js', '.py')):
            parts.append(paragraph('Явных функций не найдено: файл содержит состояние, константы, импорты или прямую настройку.'))

    parts.append(page_break())
    parts.append(paragraph('7. Построчный разбор всех файлов', 'Heading1'))
    parts.append(paragraph('Каждая строка ниже имеет номер, сам код и объяснение. Для многострочных конструкций полный смысл читается вместе с соседними строками.'))

    for rel, path in files:
        lines = read_lines(path)
        parts.append(page_break())
        parts.append(paragraph(rel, 'Heading2'))
        parts.append(paragraph(file_role(rel)))
        funcs = function_catalog(lines) if rel.endswith(('.js', '.py')) else []
        if funcs:
            parts.append(paragraph('Ключевые функции файла', 'Heading3'))
            for line_number, name, _ in funcs:
                parts.append(bullet(f'{name} (строка {line_number}) — {describe_name(name)}.'))
        parts.append(paragraph('Построчные пояснения', 'Heading3'))

        for number, line in enumerate(lines, 1):
            code = line if line else '∅'
            if len(code) > 220:
                code = code[:217] + '...'
            parts.append(code_paragraph(f'{number:04d}: {code}'))
            parts.append(paragraph(explain_line(rel, line)))

    parts.append(page_break())
    parts.append(paragraph('8. Правила поддержки мануала', 'Heading1'))
    for text in [
        'Если меняется функция, обновить раздел её файла и, если нужно, раздел взаимодействий.',
        'Если появляется новый файл, добавить его в карту проекта, каталог функций и построчный разбор.',
        'Если меняется пользовательский сценарий, обновить flow в разделе основных взаимодействий.',
        'Если меняется persistent/runtime контракт, обновить BLOCK_SYSTEM_CONTRACT.md и этот мануал.',
        'В чат после изменений писать, где и что исправлено в мануале.'
    ]:
        parts.append(bullet(text))

    parts.append('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>')
    parts.append('</w:body></w:document>')
    return ''.join(parts)


def static_xml_files():
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''
    word_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''
    styles = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{NS}">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:after="120"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:pPr><w:spacing w:after="240"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:i/><w:color w:val="666666"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:pPr><w:spacing w:before="360" w:after="180"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="27"/></w:rPr><w:pPr><w:spacing w:before="260" w:after="140"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:pPr><w:spacing w:before="200" w:after="120"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:before="160" w:after="100"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="17"/></w:rPr><w:pPr><w:spacing w:before="40" w:after="20"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="IntenseQuote"><w:name w:val="Intense Quote"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="7A5B16"/></w:rPr><w:pPr><w:ind w:left="360"/><w:spacing w:before="160" w:after="160"/></w:pPr></w:style>
</w:styles>'''
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    core = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MyOwnWorld: полный технический мануал</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''
    app = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Codex</Application></Properties>'''
    return content_types, rels, word_rels, styles, core, app


def main():
    files = collect_files()
    document_xml = build_document(files)
    content_types, rels, word_rels, styles, core, app = static_xml_files()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', content_types)
        archive.writestr('_rels/.rels', rels)
        archive.writestr('word/_rels/document.xml.rels', word_rels)
        archive.writestr('word/document.xml', document_xml)
        archive.writestr('word/styles.xml', styles)
        archive.writestr('docProps/core.xml', core)
        archive.writestr('docProps/app.xml', app)

    print(OUT)
    print(f'files={len(files)} size={OUT.stat().st_size}')


if __name__ == '__main__':
    main()
