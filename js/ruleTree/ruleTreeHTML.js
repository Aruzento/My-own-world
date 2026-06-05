import {
  escapeHTML
} from '../taskTracker/taskTrackerEscapeHTML.js';


// HTML Rule Tree намеренно компактный: пользователь управляет правилами, JSON остается persistent.

export function getRuleTreeBoardHTML(
  data,
  candidates = []
) {

  const active =
    new Set(
      data.activeRuleIds || []
    );

  const rulesHTML =
    getRuleGroupsHTML(
      data,
      active
    );

  const importedIds =
    new Set(
      data.rules.map(rule => rule.sourcePageId || rule.id)
    );

  const candidatesHTML =
    candidates
      .filter(candidate => !importedIds.has(candidate.sourcePageId || candidate.id))
      .map(getCandidateHTML)
      .join('');

  return `
    <section class="rule-tree-board" data-runtime="true" contenteditable="false">
      <div class="rule-tree-summary">
        <div>
          <span class="rule-tree-summary-label">Правил</span>
          <strong>${data.rules.length}</strong>
        </div>
        <div>
          <span class="rule-tree-summary-label">Активно</span>
          <strong>${data.activeRuleIds.length}</strong>
        </div>
      </div>

      <section class="rule-tree-panel">
        <div class="rule-tree-panel-header">
          <h2>Дерево правил</h2>
        </div>
        <div class="rule-tree-group-form">
          <input class="rule-tree-group-title-input" type="text" placeholder="Новая группа">
          <button class="rule-tree-add-group" type="button">Добавить группу</button>
        </div>
        <div class="rule-tree-list">
          ${rulesHTML}
        </div>
      </section>

      <section class="rule-tree-panel">
        <div class="rule-tree-panel-header">
          <h2>Импорт из старых rule-карточек</h2>
        </div>
        <div class="rule-tree-candidates">
          ${candidatesHTML || '<div class="rule-tree-empty">Нет новых rule-карточек для импорта.</div>'}
        </div>
      </section>
    </section>
  `;
}


function getRuleGroupsHTML(
  data,
  active
) {

  if (!data.rules.length) {

    return '<div class="rule-tree-empty">Пока нет правил. Импортируйте rule-карточки или добавьте правила позже.</div>';
  }

  const groups =
    data.groups || [];

  const byGroup =
    new Map();

  data.rules.forEach(rule => {

    const groupId =
      rule.groupId || 'core';

    byGroup.set(
      groupId,
      [
        ...(byGroup.get(groupId) || []),
        rule
      ]
    );
  });

  return groups
    .filter(group =>
      byGroup.has(group.id)
    )
    .map(group => `
      <section class="rule-tree-group" data-group-id="${escapeHTML(group.id)}">
        <div class="rule-tree-group-title">
          ${escapeHTML(group.title)}
        </div>
        <div class="rule-tree-group-rules">
          ${byGroup.get(group.id).map(rule => getRuleHTML(rule, active.has(rule.id))).join('')}
        </div>
      </section>
    `)
    .join('');
}


function getRuleHTML(
  rule,
  active
) {

  return `
    <article class="rule-tree-rule" data-rule-id="${escapeHTML(rule.id)}">
      <label class="rule-tree-active">
        <input class="rule-tree-active-checkbox" type="checkbox" ${active ? 'checked' : ''}>
        <span></span>
      </label>

      <div class="rule-tree-rule-body">
        <div class="rule-tree-rule-title">${escapeHTML(rule.title)}</div>
        <div class="rule-tree-rule-description">${escapeHTML(rule.description || 'Без описания')}</div>
        <div class="rule-tree-rule-meta">
          <span>${escapeHTML(rule.category || 'Общее')}</span>
          <span>${rule.effects.length} эффектов</span>
          <span>${rule.conditions.length} условий</span>
          <span>${rule.inheritsRuleIds.length} наследований</span>
          <span>${escapeHTML(rule.sourceType || 'ruleTree')}</span>
        </div>
      </div>

      <button class="rule-tree-remove-rule" type="button" title="Убрать из Rule Tree">×</button>
    </article>
  `;
}


function getCandidateHTML(
  rule
) {

  return `
    <article class="rule-tree-candidate" data-rule-id="${escapeHTML(rule.id)}">
      <div>
        <div class="rule-tree-rule-title">${escapeHTML(rule.title)}</div>
        <div class="rule-tree-rule-meta">
          <span>${rule.effects.length} эффектов</span>
          <span>legacy card#rule</span>
        </div>
      </div>

      <button class="rule-tree-import-rule" type="button">
        Импортировать
      </button>
    </article>
  `;
}
