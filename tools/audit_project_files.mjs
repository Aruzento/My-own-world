import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'docs', '01-delivery', 'PROJECT_FILE_AUDIT.md');

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist-desktop',
  'src-tauri/target',
  'test-results',
  'playwright-report',
]);

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.py',
  '.rs',
  '.svg',
  '.toml',
  '.txt',
  '.yml',
]);

const ENTRY_FILES = new Set([
  'index.html',
  'presentation.html',
  'js/app.js',
  'js/presentation/presentationEntry.js',
  'package.json',
  'playwright.config.mjs',
]);

const today = new Date().toISOString().slice(0, 10);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function escapeCell(value) {
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relative = toPosix(path.relative(ROOT, fullPath));

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(relative) || EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      walk(fullPath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push(relative);
    }
  }

  return files.sort((a, b) => a.localeCompare(b, 'ru'));
}

function tryGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function getGitState() {
  const tracked = new Set(
    tryGit(['ls-files'])
      .split(/\r?\n/)
      .filter(Boolean)
      .map((item) => item.replace(/\\/g, '/'))
  );
  const untracked = new Set(
    tryGit(['ls-files', '--others', '--exclude-standard'])
      .split(/\r?\n/)
      .filter(Boolean)
      .map((item) => item.replace(/\\/g, '/'))
  );

  return { tracked, untracked };
}

function ownerZone(file) {
  if (file.startsWith('.agents/')) return 'agent workflow';
  if (file.startsWith('.github/')) return 'ci';
  if (file.startsWith('assets/')) return 'assets';
  if (file.startsWith('docs/00-product/')) return 'docs/product';
  if (file.startsWith('docs/01-delivery/')) return 'docs/delivery';
  if (file.startsWith('docs/02-architecture/')) return 'docs/architecture';
  if (file.startsWith('docs/03-testing/')) return 'docs/testing';
  if (file.startsWith('docs/04-user-release/')) return 'docs/user-release';
  if (file.startsWith('docs/archive/')) return 'docs/archive';
  if (file.startsWith('docs/')) return 'docs/root';
  if (file.startsWith('js/editor/campaignMap')) return 'campaign map';
  if (file.startsWith('js/editor/')) return 'editor';
  if (file.startsWith('js/tree/')) return 'tree';
  if (file.startsWith('js/taskTracker/')) return 'task tracker';
  if (file.startsWith('js/storage/')) return 'storage';
  if (file.startsWith('js/schema/')) return 'schema';
  if (file.startsWith('js/repository/')) return 'page repository';
  if (file.startsWith('js/properties/')) return 'properties';
  if (file.startsWith('js/character/')) return 'character';
  if (file.startsWith('js/ruleTree/') || file.startsWith('js/rules')) return 'rules';
  if (file.startsWith('js/wiki/')) return 'knowledge graph';
  if (file.startsWith('js/templates/')) return 'templates';
  if (file.startsWith('js/ui/tables/')) return 'tables';
  if (file.startsWith('js/ui/')) return 'ui';
  if (file.startsWith('js/presentation/')) return 'presentation';
  if (file.startsWith('js/worldPackage/')) return 'world packages';
  if (file.startsWith('styles/')) return 'styles';
  if (file.startsWith('tests/browser/')) return 'browser tests';
  if (file.startsWith('tests/')) return 'unit tests';
  if (file.startsWith('tools/')) return 'tools';
  if (file.startsWith('src-tauri/')) return 'desktop';
  if (file.startsWith('release/')) return 'release handoff';
  if (file.startsWith('Тех. зрелость/')) return 'maturity';
  if (file.startsWith('Лог особенный/')) return 'story log';
  return 'root';
}

function purpose(file) {
  const name = path.posix.basename(file);
  const zone = ownerZone(file);

  if (name === '.gitignore') return 'Правила исключения локальных, generated и тяжелых файлов из Git.';
  if (name === '.gitattributes') return 'Правила текстовой кодировки и поведения Git для исходников.';
  if (name === 'AGENTS.md') return 'Главные правила работы Codex/AI-агента в проекте.';
  if (name === 'README.md') return 'Главная инструкция и обзор проекта.';
  if (name === 'package.json') return 'NPM scripts, зависимости и метаданные приложения.';
  if (name === 'package-lock.json') return 'Зафиксированное дерево npm-зависимостей.';
  if (name === 'playwright.config.mjs') return 'Конфигурация browser smoke/regression tests.';
  if (name === 'index.html') return 'Главная browser-точка входа приложения.';
  if (name === 'presentation.html') return 'Отдельная точка входа режима презентации карты.';
  if (name === 'debug.log') return 'Локальный debug-лог, не является исходником проекта.';

  if (file.startsWith('.agents/skills/')) return 'Описание AI-skill для повторяемого рабочего сценария Codex.';
  if (file.startsWith('.github/workflows/')) return 'GitHub Actions workflow для проверки проекта.';
  if (file.startsWith('assets/icons/')) return 'Иконки и sprite приложения.';
  if (file.startsWith('assets/rules/')) return 'Seed-данные внутреннего пространства правил.';
  if (file.startsWith('assets/')) return 'Статический asset приложения.';
  if (file.startsWith('docs/archive/')) return 'Архивный документ, сохранен для истории и трассировки решений.';
  if (file.startsWith('docs/')) return `Документация зоны ${zone}.`;
  if (file.startsWith('release/')) return 'Материалы handoff для пользователя, тестирования и релиза.';
  if (file.startsWith('src-tauri/')) return 'Desktop/Tauri оболочка, Rust backend или desktop capability.';
  if (file.startsWith('tests/browser/')) return 'Browser regression/smoke сценарий пользовательского поведения.';
  if (file.startsWith('tests/')) return 'Unit/contract regression test.';
  if (file.startsWith('tools/')) return 'Служебный инструмент проекта.';
  if (file.startsWith('styles/')) return `CSS слой: ${zone}.`;
  if (file.startsWith('js/')) return `JavaScript модуль подсистемы: ${zone}.`;
  if (file.startsWith('Тех. зрелость/')) return 'Материал или результат оценки технической зрелости.';
  if (file.startsWith('Лог особенный/')) return 'Нарративная летопись проекта для легкого понимания изменений.';

  return 'Файл проекта.';
}

function optimizeNote(file, size) {
  if (file === 'debug.log') return 'Нет смысла оптимизировать: кандидат на удаление после подтверждения.';
  if (file.endsWith('.docx')) return 'Проверить актуальность и место хранения; бинарные документы тяжелее навигации по markdown.';
  if (file.startsWith('docs/archive/')) return 'Не оптимизировать: архив не должен быть рабочим источником правды.';
  if (file.startsWith('docs/') && !file.includes('/archive/')) return 'Да: держать metadata, актуальность и кодировку под контролем.';
  if (file.startsWith('js/editor/campaignMap')) return 'Да: карта остается крупной зоной, важны performance и дальнейшее разбиение.';
  if (file.startsWith('styles/campaign-map')) return 'Да: CSS карты дробить по зонам ответственности и проверять визуально.';
  if (file.startsWith('js/editor/') || file.startsWith('js/ui/') || file.startsWith('styles/')) return 'Проверять при росте файла и дублировании поведения.';
  if (size > 200_000) return 'Да: большой файл, нужен отдельный взгляд на назначение и размер.';
  return 'Нет срочно: поддерживать через обычные проверки и контракт подсистемы.';
}

function isDocumentMarkdownWithMetadata(file) {
  if (!file.startsWith('docs/') || !file.endsWith('.md')) {
    return false;
  }

  const text = readText(file);
  if (!text) return false;

  return (
    /^---\r?\n[\s\S]*?\r?\n---/.test(text) &&
    /summary:\s*/.test(text) &&
    /owner_zone:\s*/.test(text)
  );
}

function deleteNote(file, gitState) {
  if (file === 'debug.log') return 'Да, после подтверждения: локальный лог, не должен попадать в коммит.';
  if (file === 'tools/audit_project_files.mjs') return 'Нет: новый повторяемый инструмент аудита, нужен для будущих уборок.';
  if (file === 'tools/check_text_encoding.mjs') return 'Нет: проверка кодировки подключена к npm run verify.';
  if (file === 'docs/README.md') return 'Нет: карта документации нужна после разделения docs по зонам.';
  if (file.startsWith('docs/archive/')) return 'Нет: архив хранит историю решений.';
  if (file.startsWith('tests/') && (file.endsWith('.test.mjs') || file.endsWith('.spec.mjs'))) return 'Нет: regression test, проверять через тесты и code review перед коммитом.';
  if (isDocumentMarkdownWithMetadata(file)) return 'Нет: валидный markdown-документ с metadata, даже если еще untracked до коммита.';
  if (file.startsWith('dist-desktop/') || file.startsWith('test-results/') || file.startsWith('src-tauri/target/')) return 'Да, если попал в рабочее дерево: generated artifact.';
  if (gitState.untracked.has(file)) return 'Кандидат: untracked файл, проверить назначение перед удалением.';
  return 'Нет.';
}

function readText(file) {
  const ext = path.posix.extname(file).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) return null;

  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch {
    return null;
  }
}

function hasMojibake(file, text) {
  if (file === 'tools/audit_project_files.mjs') {
    return false;
  }

  const char =
    code => String.fromCharCode(
      code
    );

  const replacementMarker =
    char(
      0xfffd
    );

  const strongMojibakePattern =
    new RegExp(
      [
        `${char(0x0420)}[\\u045f\\u045e\\u045c\\u0491\\u00b5\\u00b0\\u0451\\u0455\\u0412\\u045a\\u0403]`,
        `${char(0x0421)}[\\u0403\\u201a\\u0453\\u201e\\u2026\\u2020\\u2021\\u20ac\\u2030\\u040f]`,
        `${char(0x0432)}\\u0402`,
        replacementMarker,
        char(0x00d0),
        char(0x00d1)
      ].join('|')
    );

  return strongMojibakePattern.test(text);
}

function extractReferences(file, text) {
  const refs = new Set();
  const modulePatterns = [
    /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /@import\s+['"]([^'"]+)['"]/g,
  ];
  const domPatterns = [
    /(?:src|href)=["']\.\/([^"']+)["']/g,
  ];

  for (const pattern of modulePatterns) {
    let match;
    while ((match = pattern.exec(text))) {
      const ref = match[1];
      if (!ref || !ref.startsWith('.')) {
        continue;
      }

      const base = path.posix.dirname(file);
      const normalized = path.posix.normalize(path.posix.join(base, ref)).replace(/^\.\//, '');
      refs.add(normalized);
    }
  }

  for (const pattern of domPatterns) {
    let match;
    while ((match = pattern.exec(text))) {
      const ref = match[1]?.split('#')[0];
      if (!ref || ref.startsWith('http') || ref.startsWith('#') || ref.startsWith('data:')) {
        continue;
      }

      const base = path.posix.dirname(file);
      const normalized = path.posix.normalize(path.posix.join(base, ref)).replace(/^\.\//, '');
      refs.add(normalized);
    }
  }

  return [...refs];
}

function resolveReference(ref, filesSet) {
  const candidates = [
    ref,
    `${ref}.js`,
    `${ref}.mjs`,
    `${ref}.css`,
    `${ref}.json`,
    `${ref}/index.js`,
  ];

  return candidates.find((candidate) => filesSet.has(candidate)) || null;
}

function summarizeByZone(rows) {
  const totals = new Map();
  for (const row of rows) {
    totals.set(row.zone, (totals.get(row.zone) || 0) + 1);
  }

  return [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
}

function main() {
  const files = walk(ROOT);
  const filesSet = new Set(files);
  const gitState = getGitState();

  const rows = files.map((file) => {
    const fullPath = path.join(ROOT, file);
    const stat = fs.statSync(fullPath);
    const text = readText(file);
    return {
      file,
      zone: ownerZone(file),
      size: stat.size,
      purpose: purpose(file),
      optimize: optimizeNote(file, stat.size),
      delete: deleteNote(file, gitState),
      text,
      hasMojibake: text ? hasMojibake(file, text) : false,
    };
  });

  const referenced = new Map();
  const unresolved = [];
  for (const row of rows) {
    if (!row.text) continue;
    for (const ref of extractReferences(row.file, row.text)) {
      const resolved = resolveReference(ref, filesSet);
      if (resolved) {
        if (!referenced.has(resolved)) referenced.set(resolved, new Set());
        referenced.get(resolved).add(row.file);
      } else if (!ref.startsWith('../') && !ref.startsWith('/')) {
        unresolved.push({ from: row.file, ref });
      }
    }
  }

  const sourceLike = rows.filter((row) =>
    (row.file.startsWith('js/') || row.file.startsWith('styles/')) &&
    !ENTRY_FILES.has(row.file) &&
    !referenced.has(row.file)
  );

  const largeFiles = rows
    .filter((row) => row.size > 150_000)
    .sort((a, b) => b.size - a.size);

  const mojibakeFiles = rows.filter((row) => row.hasMojibake);
  const deleteCandidates = rows.filter((row) => /^(Да|Кандидат)/.test(row.delete));

  const lines = [];
  lines.push('---');
  lines.push('summary: "Project file audit with ownership, cleanup candidates, and two independent review passes."');
  lines.push('read_when:');
  lines.push('  - "Before deleting or moving project files"');
  lines.push('  - "When navigating project ownership"');
  lines.push('owner_zone: "delivery"');
  lines.push('---');
  lines.push('');
  lines.push('# Аудит файлов проекта');
  lines.push('');
  lines.push(`Дата: ${today}`);
  lines.push('');
  lines.push('Исключены из построчного аудита как generated/dependency зоны: `.git/`, `node_modules/`, `dist-desktop/`, `src-tauri/target/`, `test-results/`, `playwright-report/`.');
  lines.push('');
  lines.push(`Всего файлов в аудите: ${rows.length}.`);
  lines.push('');
  lines.push('## Два Независимых Прохода');
  lines.push('');
  lines.push('**Проход 1: механическая инвентаризация.** Файлы перечислены по фактическому дереву проекта, каждому назначена зона владения, назначение, риск оптимизации и возможность удаления.');
  lines.push('');
  lines.push('**Проход 2: смысловая сверка.** Дополнительно проверены ссылки/import-цепочки, крупные файлы, untracked/debug-файлы, признаки битой кодировки и generated-зоны. Этот проход независим от классификации первого прохода и нужен, чтобы не удалить редкий, но нужный файл.');
  lines.push('');
  lines.push('## Итоги По Зонам');
  lines.push('');
  lines.push('| Зона | Файлов |');
  lines.push('|---|---:|');
  for (const [zone, count] of summarizeByZone(rows)) {
    lines.push(`| ${escapeCell(zone)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Кандидаты На Уборку');
  lines.push('');
  if (deleteCandidates.length === 0) {
    lines.push('Явных кандидатов на удаление не найдено.');
  } else {
    lines.push('| Файл | Причина |');
    lines.push('|---|---|');
    for (const row of deleteCandidates) {
      lines.push(`| \`${escapeCell(row.file)}\` | ${escapeCell(row.delete)} |`);
    }
  }
  lines.push('');
  lines.push('Удалять эти файлы можно только после отдельного подтверждения владельца продукта.');
  lines.push('');
  lines.push('## Сигналы Второго Прохода');
  lines.push('');
  lines.push('### Крупные Файлы');
  lines.push('');
  lines.push('| Файл | Размер | Что сделать |');
  lines.push('|---|---:|---|');
  for (const row of largeFiles) {
    lines.push(`| \`${escapeCell(row.file)}\` | ${row.size} | ${escapeCell(row.optimize)} |`);
  }
  lines.push('');
  lines.push('### Возможная Битая Кодировка');
  lines.push('');
  if (mojibakeFiles.length === 0) {
    lines.push('Признаков mojibake в текстовых файлах не найдено.');
  } else {
    lines.push('| Файл | Комментарий |');
    lines.push('|---|---|');
    for (const row of mojibakeFiles) {
      lines.push(`| \`${escapeCell(row.file)}\` | Найдены характерные последовательности mojibake. Нужна ручная проверка/восстановление в 0.0.0.8.2. |`);
    }
  }
  lines.push('');
  lines.push('### Потенциально Неподключенные JS/CSS Файлы');
  lines.push('');
  lines.push('Это не список на удаление. В проекте есть dynamic imports, runtime selectors и тестовые входы, поэтому список используется только как навигационная подсказка для второго прохода.');
  lines.push('');
  lines.push('| Файл | Зона | Решение |');
  lines.push('|---|---|---|');
  for (const row of sourceLike.slice(0, 80)) {
    lines.push(`| \`${escapeCell(row.file)}\` | ${escapeCell(row.zone)} | Проверить при уборке подсистемы; не удалять автоматически. |`);
  }
  if (sourceLike.length > 80) {
    lines.push(`| ... | ... | Еще ${sourceLike.length - 80} файлов скрыты в кратком списке; они остаются в полном аудите ниже. |`);
  }
  lines.push('');
  lines.push('### Неразрешенные Относительные Ссылки');
  lines.push('');
  if (unresolved.length === 0) {
    lines.push('Неразрешенных относительных ссылок/import-ов не найдено.');
  } else {
    lines.push('| Откуда | Ссылка |');
    lines.push('|---|---|');
    for (const item of unresolved.slice(0, 60)) {
      lines.push(`| \`${escapeCell(item.from)}\` | \`${escapeCell(item.ref)}\` |`);
    }
    if (unresolved.length > 60) {
      lines.push(`| ... | Еще ${unresolved.length - 60} ссылок скрыты из краткого списка. |`);
    }
  }
  lines.push('');
  lines.push('## Полная Инвентаризация');
  lines.push('');
  lines.push('| Название файла | Зона | За что отвечает | Нужно ли оптимизировать | Можно ли удалить? |');
  lines.push('|---|---|---|---|---|');
  for (const row of rows) {
    lines.push(`| \`${escapeCell(row.file)}\` | ${escapeCell(row.zone)} | ${escapeCell(row.purpose)} | ${escapeCell(row.optimize)} | ${escapeCell(row.delete)} |`);
  }
  lines.push('');
  lines.push('## Результат');
  lines.push('');
  lines.push('- Этот отчет является снимком навигации и рисков по файлам, а не разрешением на удаление.');
  lines.push('- Удаление/архивация начинается только после подтвержденного списка из раздела “Кандидаты На Уборку”.');
  lines.push('- Актуальный следующий шаг всегда находится в `docs/01-delivery/PROJECT_PLAN.md`.');

  fs.writeFileSync(OUTPUT, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${rows.length} files.`);
  console.log(`Delete candidates: ${deleteCandidates.length}`);
  console.log(`Mojibake candidates: ${mojibakeFiles.length}`);
}

main();
