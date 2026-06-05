import {
  CHARACTER_CONDITION_KEYS,
  CONDITION_LABELS,
  addCharacterCondition,
  addCharacterEffect,
  createEffectsModel,
  createSerializableEffectsData,
  getCharacterEffectsSummary,
  removeCharacterCondition,
  removeCharacterEffect
} from '../character/effectsModel.js';

import {
  createEffectFromSourcePage,
  getEffectSourceCandidates,
  getEffectSourceLabel,
  mergeEffectsModels
} from '../character/effectSourceResolver.js';

import {
  state
} from '../state.js';

import {
  getRuleTreeRuleOptions
} from '../rules/ruleTreeProvider.js';


let saveCurrentPageRef = null;


// Runtime-контроллер блока эффектов. Persistent-источник остается JSON-скриптом,
// а все кнопки и формы пересобираются при открытии карточки и не сохраняются как UI.
export function setupCharacterEffectsBlocks(
  editor,
  saveCurrentPage
) {

  saveCurrentPageRef =
    saveCurrentPage;

  editor.addEventListener(
    'click',
    event => {

      const block =
        event.target.closest(
          '.character-effects-block'
        );

      if (!block) return;

      const addCondition =
        event.target.closest(
          '.character-effects-add-condition'
        );

      const addEffect =
        event.target.closest(
          '.character-effects-add-effect'
        );

      const removeCondition =
        event.target.closest(
          '[data-remove-condition]'
        );

      const removeEffect =
        event.target.closest(
          '[data-remove-effect]'
        );

      const addRule =
        event.target.closest(
          '.character-effects-add-rule'
        );

      const removeRule =
        event.target.closest(
          '[data-remove-rule]'
        );

      if (addCondition) {

        event.preventDefault();
        addConditionFromBlock(
          block
        );
      }

      if (addEffect) {

        event.preventDefault();
        addEffectFromBlock(
          block
        );
      }

      if (addRule) {

        event.preventDefault();
        addRuleFromBlock(
          block
        );
      }

      if (removeRule) {

        event.preventDefault();
        removeRuleFromBlock(
          block,
          removeRule.dataset.removeRule
        );
      }

      if (removeCondition) {

        event.preventDefault();
        updateEffectsBlockModel(
          block,
          removeCharacterCondition(
            readEffectsBlockModel(
              block
            ),
            removeCondition.dataset.removeCondition
          )
        );
      }

      if (removeEffect) {

        event.preventDefault();
        updateEffectsBlockModel(
          block,
          removeCharacterEffect(
            readEffectsBlockModel(
              block
            ),
            removeEffect.dataset.removeEffect
          )
        );
      }
    }
  );

  editor.addEventListener(
    'change',
    event => {

      const select =
        event.target.closest(
          '.character-effects-source-page'
        );

      if (!select) return;

      const option =
        select.selectedOptions?.[0];

      const sourceType =
        option?.dataset.sourceType;

      if (!sourceType) return;

      const block =
        select.closest(
          '.character-effects-block'
        );

      const sourceTypeSelect =
        block?.querySelector(
          '.character-effects-source-type'
        );

      if (sourceTypeSelect) {

        sourceTypeSelect.value =
          sourceType;
      }
    }
  );
}


export function renderCharacterEffectsBlocks(
  editor
) {

  const blocks =
    [
      editor.matches?.('.character-effects-block')
        ? editor
        : null,
      ...editor.querySelectorAll(
        '.character-effects-block'
      )
    ].filter(Boolean);

  blocks
    .forEach(block => {

      ensureEffectsDataElement(
        block
      );

      renderEffectsBlock(
        block
      );
    });
}


export function readEffectsBlockModel(
  block
) {

  return createEffectsModel(
    readEffectsJSON(
      getEffectsDataElement(
        block
      )?.textContent || ''
    )
  );
}


function addConditionFromBlock(
  block
) {

  const conditionKey =
    block.querySelector(
      '.character-effects-condition-select'
    )?.value;

  const level =
    block.querySelector(
      '.character-effects-exhaustion-level'
    )?.value;

  updateEffectsBlockModel(
    block,
    addCharacterCondition(
      readEffectsBlockModel(
        block
      ),
      {
        key:
          conditionKey,
        level
      }
    )
  );
}


function addEffectFromBlock(
  block
) {

  const sourcePageId =
    block.querySelector(
      '.character-effects-source-page'
    )?.value || '';

  if (sourcePageId) {

    addEffectFromSelectedSource(
      block,
      sourcePageId
    );

    return;
  }

  const title =
    block.querySelector(
      '.character-effects-effect-title'
    )?.value.trim();

  if (!title) return;

  updateEffectsBlockModel(
    block,
    addCharacterEffect(
      readEffectsBlockModel(
        block
      ),
      {
        title,
        sourceType:
          block.querySelector(
            '.character-effects-source-type'
          )?.value,
        duration:
          block.querySelector(
            '.character-effects-duration'
          )?.value,
        note:
          block.querySelector(
            '.character-effects-note'
          )?.value,
        sourcePageId:
          '',
        sourcePackageId:
          block.querySelector(
            '.character-effects-package-id'
          )?.value,
        ruleId:
          block.querySelector(
            '.character-effects-rule-id'
          )?.value,
        modifiers: {
          armorClass:
            block.querySelector(
              '.character-effects-ac'
            )?.value,
          speed:
            block.querySelector(
              '.character-effects-speed'
            )?.value,
          initiative:
            block.querySelector(
              '.character-effects-initiative'
            )?.value
        }
      }
    )
  );
}


function addEffectFromSelectedSource(
  block,
  sourcePageId
) {

  const sourcePage =
    state.pages.find(page =>
      page.id === sourcePageId
    );

  if (!sourcePage) return;

  const sourceType =
    block.querySelector(
      '.character-effects-source-page'
    )
      ?.selectedOptions?.[0]
      ?.dataset.sourceType ||
    block.querySelector(
      '.character-effects-source-type'
    )?.value || sourcePage.type;

  const linkedEffects =
    createEffectFromSourcePage(
      sourcePage,
      {
        sourceType:
          sourceType || 'item'
      }
    );

  if (!linkedEffects) return;

  updateEffectsBlockModel(
    block,
    mergeEffectsModels(
      readEffectsBlockModel(
        block
      ),
      linkedEffects
    )
  );
}


function addRuleFromBlock(
  block
) {

  const ruleId =
    block.querySelector(
      '.character-effects-rule-select'
    )?.value || '';

  if (!ruleId) return;

  const model =
    readEffectsBlockModel(
      block
    );

  updateEffectsBlockModel(
    block,
    {
      ...model,
      selectedRuleIds: [
        ...new Set([
          ...(model.selectedRuleIds || []),
          ruleId
        ])
      ]
    }
  );
}


function removeRuleFromBlock(
  block,
  ruleId
) {

  const model =
    readEffectsBlockModel(
      block
    );

  updateEffectsBlockModel(
    block,
    {
      ...model,
      selectedRuleIds:
        (model.selectedRuleIds || [])
          .filter(id =>
            id !== ruleId
          )
    }
  );
}


function updateEffectsBlockModel(
  block,
  effectsModel
) {

  const dataElement =
    ensureEffectsDataElement(
      block
    );

  dataElement.textContent =
    JSON.stringify(
      createSerializableEffectsData(
        effectsModel
      )
    );

  renderEffectsBlock(
    block
  );

  saveCurrentPageRef?.();
}


function renderEffectsBlock(
  block
) {

  const model =
    readEffectsBlockModel(
      block
    );

  const summary =
    getCharacterEffectsSummary(
      model
    );

  const summaryElement =
    ensureRuntimeContainer(
      block,
      '.character-effects-summary',
      'character-effects-summary'
    );

  const controlsElement =
    ensureRuntimeContainer(
      block,
      '.character-effects-controls',
      'character-effects-controls'
    );

  summaryElement.innerHTML =
    getSummaryHTML(
      model,
      summary
    );

  controlsElement.innerHTML =
    getControlsHTML(
      block
    );
}


function getSummaryHTML(
  model,
  summary
) {

  const conditions =
    model.conditions.length
      ? model.conditions.map(condition => `
        <span class="character-effect-pill is-condition">
          ${escapeHTML(condition.level ? `${condition.label} ${condition.level}` : condition.label)}
          <button type="button" data-remove-condition="${escapeAttribute(condition.key)}">x</button>
        </span>
      `).join('')
      : '<span class="character-effects-empty">Состояний нет</span>';

  const effects =
    model.effects.length
      ? model.effects.map(effect => `
        <span class="character-effect-pill">
          ${escapeHTML(effect.title)}
          <small>${escapeHTML(getEffectModifierText(effect))}</small>
          <button type="button" data-remove-effect="${escapeAttribute(effect.id)}">x</button>
        </span>
      `).join('')
      : '<span class="character-effects-empty">Эффектов нет</span>';

  const rules =
    getSelectedRulesHTML(
      model
    );

  return `
    <div class="character-effects-row">
      <strong>Состояния</strong>
      <div class="character-effects-pill-list">${conditions}</div>
    </div>
    <div class="character-effects-row">
      <strong>Эффекты</strong>
      <div class="character-effects-pill-list">${effects}</div>
    </div>
    <div class="character-effects-row">
      <strong>Правила</strong>
      <div class="character-effects-pill-list">${rules}</div>
    </div>
    <div class="character-effects-flags">
      ${summary.flags.isIncapacitated ? '<span>Недееспособен</span>' : ''}
      ${summary.flags.speedIsZero ? '<span>Скорость 0</span>' : ''}
      ${summary.modifiers.initiative ? `<span>Иниц. ${formatSigned(summary.modifiers.initiative)}</span>` : ''}
      ${summary.modifiers.armorClass ? `<span>КЗ ${formatSigned(summary.modifiers.armorClass)}</span>` : ''}
      ${summary.modifiers.speed ? `<span>Скорость ${formatSigned(summary.modifiers.speed)}</span>` : ''}
    </div>
  `;
}


function getControlsHTML(
  block
) {

  const conditionOptions =
    CHARACTER_CONDITION_KEYS.map(key =>
      `<option value="${key}">${escapeHTML(CONDITION_LABELS[key] || key)}</option>`
    ).join('');

  const sourceOptions =
    getSourceOptionsHTML(
      block
    );

  const ruleOptions =
    getRuleOptionsHTML(
      readEffectsBlockModel(
        block
      )
    );

  return `
    <div class="character-effects-add-panel">
      <label>
        <span>Состояние</span>
        <select class="character-effects-condition-select">
          ${conditionOptions}
        </select>
      </label>
      <label>
        <span>Истощение</span>
        <input class="character-effects-exhaustion-level" type="number" min="1" max="6" value="1">
      </label>
      <button class="character-effects-add-condition ui-button" type="button">Добавить состояние</button>
    </div>

    <div class="character-effects-add-panel is-effect">
      <label>
        <span>Эффект</span>
        <input class="character-effects-effect-title" type="text" placeholder="Например: Благословение">
      </label>
      <label>
        <span>Источник</span>
        <select class="character-effects-source-type">
          <option value="manual">ручной</option>
          <option value="item">предмет</option>
          <option value="spell">заклинание</option>
          <option value="skill">навык</option>
          <option value="rule">правило</option>
          <option value="world-package">world package</option>
        </select>
      </label>
      <label class="is-wide">
        <span>Карточка-источник</span>
        <select class="character-effects-source-page">
          <option value="">Не выбрана</option>
          ${sourceOptions}
        </select>
      </label>
      <label>
        <span>Длительность</span>
        <input class="character-effects-duration" type="text" placeholder="1 минута">
      </label>
      <label>
        <span>КЗ</span>
        <input class="character-effects-ac" type="number" value="0">
      </label>
      <label>
        <span>Скорость</span>
        <input class="character-effects-speed" type="number" value="0">
      </label>
      <label>
        <span>Инициатива</span>
        <input class="character-effects-initiative" type="number" value="0">
      </label>
      <label class="is-wide">
        <span>Заметка</span>
        <input class="character-effects-note" type="text" placeholder="Что делает эффект">
      </label>
      <label>
        <span>Rule ID</span>
        <input class="character-effects-rule-id" type="text" placeholder="future-rule-id">
      </label>
      <label>
        <span>Package ID</span>
        <input class="character-effects-package-id" type="text" placeholder="world-package">
      </label>
      <button class="character-effects-add-effect ui-button" type="button">Добавить эффект</button>
    </div>

    <div class="character-effects-add-panel is-rules">
      <label class="is-wide">
        <span>Правило из Rule Tree</span>
        <select class="character-effects-rule-select">
          ${ruleOptions}
        </select>
      </label>
      <button class="character-effects-add-rule ui-button" type="button">Добавить правило</button>
    </div>
  `;
}


function getSelectedRulesHTML(
  model
) {

  const options =
    new Map(
      getRuleTreeRuleOptions(
        state.pages
      )
        .map(option => [
          option.id,
          option
        ])
    );

  const ids =
    model.selectedRuleIds || [];

  if (!ids.length) {

    return '<span class="character-effects-empty">Правила не выбраны</span>';
  }

  return ids.map(id => {

    const option =
      options.get(id);

    return `
      <span class="character-effect-pill is-rule">
        ${escapeHTML(option?.title || id)}
        <small>${option?.effectCount || 0} эффектов</small>
        <button type="button" data-remove-rule="${escapeAttribute(id)}">x</button>
      </span>
    `;
  }).join('');
}


function getRuleOptionsHTML(
  model
) {

  const selected =
    new Set(
      model.selectedRuleIds || []
    );

  const options =
    getRuleTreeRuleOptions(
      state.pages
    )
      .filter(option =>
        !selected.has(
          option.id
        )
      );

  if (!options.length) {

    return '<option value="">Нет доступных правил</option>';
  }

  return [
    '<option value="">Выберите правило</option>',
    ...options.map(option => `
      <option value="${escapeAttribute(option.id)}">
        ${escapeHTML(option.title)} (${option.effectCount})
      </option>
    `)
  ].join('');
}


function getSourceOptionsHTML(
  block
) {

  const currentPageId =
    state.currentPage?.id ||
    block.closest('[data-page-id]')?.dataset.pageId ||
    '';

  return [
    'item',
    'spell',
    'skill'
  ]
    .flatMap(sourceType =>
      getEffectSourceCandidates({
        pages:
          state.pages,
        sourceType,
        currentPageId
      })
        .map(page => `
          <option value="${escapeAttribute(page.id)}" data-source-type="${escapeAttribute(sourceType)}">
            ${escapeHTML(getEffectSourceLabel(sourceType))}: ${escapeHTML(page.title)}
          </option>
        `)
    )
    .join('');
}


function ensureEffectsDataElement(
  block
) {

  const existing =
    getEffectsDataElement(
      block
    );

  if (existing) return existing;

  const script =
    document.createElement('script');

  script.type =
    'application/json';

  script.className =
    'character-effects-data';

  script.setAttribute(
    'data-character-effects',
    ''
  );

  script.textContent =
    '{"version":1,"conditions":[],"effects":[]}';

  block.appendChild(
    script
  );

  return script;
}


function getEffectsDataElement(
  block
) {

  return block.querySelector(
    '[data-character-effects]'
  );
}


function ensureRuntimeContainer(
  block,
  selector,
  className
) {

  const existing =
    block.querySelector(
      selector
    );

  if (existing) {

    existing.dataset.runtime =
      'true';

    existing.setAttribute(
      'contenteditable',
      'false'
    );

    return existing;
  }

  const element =
    document.createElement('div');

  element.className =
    className;

  element.dataset.runtime =
    'true';

  element.setAttribute(
    'contenteditable',
    'false'
  );

  block.appendChild(
    element
  );

  return element;
}


function getEffectModifierText(
  effect
) {

  const parts = [
    effect.modifiers.armorClass
      ? `КЗ ${formatSigned(effect.modifiers.armorClass)}`
      : '',
    effect.modifiers.speed
      ? `скор. ${formatSigned(effect.modifiers.speed)}`
      : '',
    effect.modifiers.initiative
      ? `иниц. ${formatSigned(effect.modifiers.initiative)}`
      : ''
  ].filter(Boolean);

  return parts.join(', ');
}


function readEffectsJSON(
  raw
) {

  try {

    return JSON.parse(
      raw || '{}'
    );

  } catch {

    return {};
  }
}


function formatSigned(
  value
) {

  const number =
    Number(value) || 0;

  return number >= 0
    ? `+${number}`
    : String(number);
}


function escapeHTML(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  )
    .replaceAll('"', '&quot;');
}
