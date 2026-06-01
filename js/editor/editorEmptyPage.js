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
    <section class="empty-editor-page" contenteditable="false">
      <div class="empty-editor-inner">
        <p class="empty-editor-kicker">Добро пожаловать</p>
        <h1>Создайте свой мир</h1>

        <div class="empty-create-grid">
          <button
            class="empty-create-option"
            type="button"
            data-template="card"
          >
            <span class="empty-create-icon">◇</span>
            <span>Карточка</span>
          </button>

          <button
            class="empty-create-option"
            type="button"
            data-template="campaignMap"
          >
            <span class="empty-create-icon">▧</span>
            <span>Карта</span>
          </button>

          <button
            class="empty-create-option"
            type="button"
            data-template="taskTracker"
          >
            <span class="empty-create-icon">☑</span>
            <span>Таски</span>
          </button>
        </div>
      </div>
    </section>
  `;

  renderTree();

  setStatus(
    'Пустая страница'
  );
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

  editor.innerHTML = `
    <section class="empty-editor-page" contenteditable="false">
      <div class="empty-editor-inner">
        <p class="empty-editor-kicker">Диагностика workspace</p>
        <h1>Найдены ошибки данных</h1>

        <p class="empty-editor-note">
          Приложение не исправляет эти ошибки автоматически. Сначала создайте
          резервную копию workspace, затем исправьте источник проблемы.
        </p>

        <div class="workspace-recovery-list">
          ${actions
            .map(action => `
              <article class="workspace-recovery-item">
                <strong>${escapeHTML(action.code)}</strong>
                <span>${escapeHTML(action.message)}</span>
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
