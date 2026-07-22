import {
  iconSvg
} from '../core/icons.js';

import {
  setCurrentPage
} from '../stateActions.js';

import {
  createPage
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  setStatus
} from '../ui/ui.js';

export function setupEmptyEditorActions(
  editor,
  openPage
) {

  editor.addEventListener(
    'click',
    async event => {

      const emptyCreateButton =
        event.target.closest(
          '.empty-create-option'
        );

      if (!emptyCreateButton) return;

      event.preventDefault();

      const page =
        await createPage(
          emptyCreateButton.dataset.template || 'card'
        );

      renderTree();

      if (page) {

        openPage(
          page
        );
      }
    }
  );
}

export function renderEmptyEditorContent(
  editor
) {

  setCurrentPage(
    null
  );

  editor.innerHTML = `
    <section class="empty-editor-page" contenteditable="false" data-app-shell-surface="empty-workspace">
      <div class="empty-editor-inner empty-workbench-card">
        <p class="empty-editor-kicker">Добро пожаловать</p>
        <h1>Создайте свой мир</h1>

        <p class="empty-editor-note">
          Выберите, с чего начать: карточку персонажа или локации, карту сцены,
          доску задач, правила или граф связей.
        </p>

        <div class="empty-create-grid empty-workbench-actions" aria-label="Создать первый объект">
          ${renderEmptyCreateButton({
            template: 'card',
            icon: 'document',
            label: 'Карточка'
          })}

          ${renderEmptyCreateButton({
            template: 'campaignMap',
            icon: 'campaign-map',
            label: 'Карта'
          })}

          ${renderEmptyCreateButton({
            template: 'taskTracker',
            icon: 'task-tracker',
            label: 'Задачи'
          })}

          ${renderEmptyCreateButton({
            template: 'ruleTree',
            icon: 'lore',
            label: 'Правила'
          })}

          ${renderEmptyCreateButton({
            template: 'knowledgeGraph',
            icon: 'link',
            label: 'Граф связей'
          })}
        </div>
      </div>
    </section>
  `;

  renderTree();

  setStatus(
    'Пустая страница'
  );
}


function renderEmptyCreateButton({
  template,
  icon,
  label
}) {

  return `
    <button
      class="empty-create-option"
      type="button"
      data-template="${template}"
    >
      <span class="empty-create-icon">
        ${iconSvg(icon, 'app-icon', {
          size: 'md'
        })}
      </span>
      <span>${label}</span>
    </button>
  `;
}


export function renderWorkspaceRecoveryEditorContent(
  editor,
  report
) {

  setCurrentPage(
    null
  );

  const actions =
    Array.isArray(report?.actions)
      ? report.actions
      : [];

  const issueGroups =
    Array.isArray(report?.issueGroups)
      ? report.issueGroups
      : [];

  editor.innerHTML = `
    <section class="empty-editor-page" contenteditable="false">
      <div class="empty-editor-inner">
        <p class="empty-editor-kicker">Диагностика workspace</p>
        <h1>Найдены ошибки данных</h1>

        <p class="empty-editor-note">
          Приложение не исправляет эти ошибки автоматически. Сначала создайте
          резервную копию workspace, затем исправьте источник проблемы.
        </p>

        ${getRecoverySummaryHTML(
          report
        )}

        ${getRecoveryGroupsHTML(
          issueGroups
        )}

        <div class="workspace-recovery-list">
          ${actions
            .map(action => `
              <article class="workspace-recovery-item">
                <strong>${escapeHTML(action.code)}</strong>
                <span>${escapeHTML(action.message)}</span>
                ${getRecoveryRepairHTML(
                  action.repairAction
                )}
              </article>
            `)
            .join('')}
        </div>
      </div>
    </section>
  `;

  renderTree();

  setStatus(
    'Найдены ошибки схемы workspace'
  );
}


function getRecoverySummaryHTML(
  report
) {

  const summary =
    report?.summary || {};

  const cards =
    [
      [
        'Всего',
        report?.issueCount || summary.issueCount || 0
      ],
      [
        'Ошибки',
        report?.errorCount || 0
      ],
      [
        'Предупреждения',
        report?.warningCount || 0
      ],
      [
        'Можно после backup',
        report?.safeActionCount || summary.safeActionCount || 0
      ]
    ];

  return `
    <div class="workspace-recovery-summary">
      ${cards
        .map(([label, value]) => `
          <span>
            <strong>${escapeHTML(value)}</strong>
            <small>${escapeHTML(label)}</small>
          </span>
        `)
        .join('')}
    </div>
  `;
}


function getRecoveryGroupsHTML(
  groups
) {

  if (!groups.length) return '';

  return `
    <div class="workspace-recovery-groups">
      ${groups
        .map(group => `
          <article class="workspace-recovery-group">
            <header>
              <strong>${escapeHTML(group.label)}</strong>
              <span>${escapeHTML(group.issueCount)} шт.</span>
            </header>
            <p>${escapeHTML(group.description)}</p>
            <div class="workspace-recovery-group-meta">
              ${getRecoveryGroupMetaHTML(
                group
              )}
            </div>
          </article>
        `)
        .join('')}
    </div>
  `;
}


function getRecoveryGroupMetaHTML(
  group
) {

  const meta =
    [
      [
        group.errorCount,
        'ошибок'
      ],
      [
        group.warningCount,
        'предупреждений'
      ],
      [
        group.safeActionCount,
        'безопасных действий'
      ],
      [
        group.legacyWarningCount,
        'legacy'
      ]
    ]
      .filter(([value]) =>
        Number(value || 0) > 0
      );

  if (!meta.length) return '';

  return meta
    .map(([value, label]) =>
      `<span>${escapeHTML(value)} ${escapeHTML(label)}</span>`
    )
    .join('');
}


function getRecoveryRepairHTML(
  repairAction
) {

  if (!repairAction) return '';

  const isManual =
    repairAction.safety === 'manual';

  return `
    <div class="workspace-recovery-repair ${isManual ? 'is-manual' : 'is-safe'}">
      <span class="workspace-recovery-repair-label">${escapeHTML(repairAction.label)}</span>
      <span class="workspace-recovery-repair-description">${escapeHTML(repairAction.description)}</span>
      <span class="workspace-recovery-repair-note">
        ${repairAction.requiresBackup ? 'Требует backup перед применением.' : 'Backup не требуется.'}
      </span>
    </div>
  `;
}


function escapeHTML(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
