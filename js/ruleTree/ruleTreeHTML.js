import {
  escapeHTML
} from '../taskTracker/taskTrackerEscapeHTML.js';

import {
  resolveRuleInheritance
} from './ruleTreeEngine.js';


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

  const diagnosticsHTML =
    getDiagnosticsHTML(
      data
    );

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
          <h2>Предпросмотр активных эффектов</h2>
        </div>
        <div class="rule-tree-preview">
          ${getEffectsPreviewHTML(data)}
        </div>
      </section>

      <section class="rule-tree-panel">
        <div class="rule-tree-panel-header">
          <h2>Диагностика правил</h2>
        </div>
        <div class="rule-tree-diagnostics">
          ${diagnosticsHTML}
        </div>
      </section>

      <section class="rule-tree-panel">
        <div class="rule-tree-panel-header">
          <h2>Пакет правил</h2>
        </div>
        <div class="rule-tree-package">
          <textarea class="rule-tree-package-json" spellcheck="false" placeholder="JSON пакета правил">${escapeHTML(JSON.stringify(data, null, 2))}</textarea>
          <div class="rule-tree-package-actions">
            <button class="rule-tree-export-package" type="button">Обновить JSON</button>
            <button class="rule-tree-import-package" type="button">Импортировать JSON</button>
          </div>
          <div class="rule-tree-package-manager">
            <div class="rule-tree-package-file-row">
              <input class="rule-tree-package-id" type="text" placeholder="id пакета">
              <button class="rule-tree-save-package-file" type="button">Сохранить файл</button>
              <button class="rule-tree-refresh-packages" type="button">Обновить список</button>
            </div>
            <div class="rule-tree-package-file-row">
              <select class="rule-tree-package-file-select">
                <option value="">Нет загруженных package-файлов</option>
              </select>
              <button class="rule-tree-load-package-file" type="button">Импорт файла</button>
              <button class="rule-tree-remove-package-file" type="button">Удалить файл</button>
            </div>
            <div class="rule-tree-package-status" aria-live="polite"></div>
          </div>
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


function getDiagnosticsHTML(
  data
) {

  const inheritance =
    resolveRuleInheritance(
      data.rules
    );

  const structuralDiagnostics =
    inheritance.diagnostics || [];

  const ruleRows =
    data.rules.map(rule =>
      getRuleDiagnosticHTML(
        rule,
        inheritance.rules.find(item =>
          item.id === rule.id
        )
      )
    ).join('');

  return `
    <div class="rule-tree-diagnostic-summary ${structuralDiagnostics.length ? 'is-warning' : 'is-ok'}">
      ${structuralDiagnostics.length
        ? `Найдено предупреждений: ${structuralDiagnostics.length}`
        : 'Ошибок структуры правил нет.'}
    </div>
    ${structuralDiagnostics.map(getStructuralDiagnosticHTML).join('')}
    <div class="rule-tree-diagnostic-rules">
      ${ruleRows || '<div class="rule-tree-empty">Правил пока нет, диагностировать нечего.</div>'}
    </div>
  `;
}


function getStructuralDiagnosticHTML(
  diagnostic
) {

  return `
    <div class="rule-tree-diagnostic-item is-warning">
      <strong>${escapeHTML(diagnostic.type || 'warning')}</strong>
      <span>${escapeHTML(diagnostic.message || 'Проверьте правило')}</span>
    </div>
  `;
}


function getRuleDiagnosticHTML(
  rule,
  resolvedRule
) {

  const inheritedConditions =
    Math.max(
      0,
      Number(resolvedRule?.conditions?.length || 0) - rule.conditions.length
    );

  const inheritedEffects =
    Math.max(
      0,
      Number(resolvedRule?.effects?.length || 0) - rule.effects.length
    );

  return `
    <div class="rule-tree-diagnostic-rule" data-diagnostic-rule-id="${escapeHTML(rule.id)}">
      <div>
        <strong>${escapeHTML(rule.title)}</strong>
        <span>${escapeHTML(rule.id)}</span>
      </div>
      <div class="rule-tree-diagnostic-tags">
        <span>${rule.conditions.length} своих условий</span>
        <span>${inheritedConditions} унаследованных условий</span>
        <span>${rule.effects.length} своих эффектов</span>
        <span>${inheritedEffects} унаследованных эффектов</span>
      </div>
      ${rule.conditions.length
        ? `<div class="rule-tree-diagnostic-conditions">${rule.conditions.map(getConditionDiagnosticHTML).join('')}</div>`
        : '<small>Правило применяется вручную или без условий.</small>'}
    </div>
  `;
}


function getConditionDiagnosticHTML(
  condition
) {

  return `
    <span class="rule-tree-condition-chip">
      ${escapeHTML(condition.type)}: ${escapeHTML(condition.value || condition.note || 'условие')}
    </span>
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
          ${byGroup.get(group.id).map(rule => getRuleHTML(rule, active.has(rule.id), data)).join('')}
        </div>
      </section>
    `)
    .join('');
}


function getRuleHTML(
  rule,
  active,
  data
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
        <div class="rule-tree-rule-editor">
          <label>
            <span>Группа</span>
            <select class="rule-tree-rule-group">
              ${getGroupOptionsHTML(data, rule.groupId)}
            </select>
          </label>
          <label>
            <span>Категория</span>
            <input class="rule-tree-rule-category" type="text" value="${escapeHTML(rule.category || 'Общее')}">
          </label>
          <label>
            <span>Наследует ID</span>
            <input class="rule-tree-rule-inherits" type="text" value="${escapeHTML(rule.inheritsRuleIds.join(', '))}">
          </label>
          <label>
            <span>Package ID</span>
            <input class="rule-tree-rule-package" type="text" value="${escapeHTML(rule.sourcePackageId || '')}">
          </label>
        </div>
        <div class="rule-tree-conditions">
          ${getConditionsHTML(rule)}
          <div class="rule-tree-condition-form">
            <select class="rule-tree-condition-type">
              <option value="manual">manual</option>
              <option value="level">level</option>
              <option value="state">state</option>
              <option value="card-variable">card-variable</option>
              <option value="formula">formula</option>
            </select>
            <input class="rule-tree-condition-value" type="text" placeholder="value">
            <input class="rule-tree-condition-note" type="text" placeholder="описание">
            <button class="rule-tree-add-condition" type="button">+</button>
          </div>
        </div>
      </div>

      <button class="rule-tree-remove-rule" type="button" title="Убрать из Rule Tree">×</button>
    </article>
  `;
}


function getGroupOptionsHTML(
  data,
  currentGroupId
) {

  return (data.groups || [])
    .map(group => `
      <option value="${escapeHTML(group.id)}" ${group.id === currentGroupId ? 'selected' : ''}>
        ${escapeHTML(group.title)}
      </option>
    `)
    .join('');
}


function getConditionsHTML(
  rule
) {

  if (!rule.conditions.length) {

    return '<div class="rule-tree-condition-empty">Условий пока нет</div>';
  }

  return rule.conditions
    .map((condition, index) => `
      <div class="rule-tree-condition" data-condition-index="${index}">
        <span>${escapeHTML(condition.type)}</span>
        <strong>${escapeHTML(condition.value || condition.note || 'условие')}</strong>
        <small>${escapeHTML(condition.note || '')}</small>
        <button class="rule-tree-remove-condition" type="button">×</button>
      </div>
    `)
    .join('');
}


function getEffectsPreviewHTML(
  data
) {

  const active =
    new Set(
      data.activeRuleIds || []
    );

  const effects =
    data.rules
      .filter(rule =>
        active.has(rule.id)
      )
      .flatMap(rule =>
        rule.effects.map(effect => ({
          rule,
          effect
        }))
      );

  if (!effects.length) {

    return '<div class="rule-tree-empty">Нет активных эффектов для предпросмотра.</div>';
  }

  return effects.map(({ rule, effect }) => `
    <div class="rule-tree-effect-preview">
      <strong>${escapeHTML(rule.title)}</strong>
      <span>${escapeHTML(effect.title || effect.id || 'Эффект')}</span>
      <small>${escapeHTML(getModifierText(effect.modifiers || {}))}</small>
    </div>
  `).join('');
}


function getModifierText(
  modifiers
) {

  const parts =
    Object.entries(modifiers || {})
      .filter(([, value]) =>
        typeof value !== 'object' &&
        Number(value)
      )
      .map(([key, value]) =>
        `${key}: ${Number(value) > 0 ? '+' : ''}${value}`
      );

  return parts.join(', ') || 'без числовых модификаторов';
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
