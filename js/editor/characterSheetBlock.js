import { DND_CHECK_GROUPS } from '../character/dndCheckContract.js';
import { ensureCharacterGameplayCatalog } from '../character/characterGameplayCommands.js';
import { checkField, validateStructuredCharacterSheetInput } from './characterSheetCharacter.js';
import {
  CHARACTER_ABILITY_KEYS,
  getCharacterEffectiveArmorClass,
  getCharacterEffectiveSpeed,
  getCharacterHealth,
  getCharacterInitiativeModifier
} from '../character/characterModel.js';

import {
  state
} from '../state.js';

import {
  ensurePropertiesBlockForPage,
  notifyPropertiesInput,
  setCalculatedPropertyOverride,
  setPropertyFieldValue
} from '../properties/propertiesDomWriter.js';

import {
  getPropertyValue,
  readPropertiesModelsFromHTML
} from '../properties/propertiesModel.js';

import {
  commitStructuredCharacterSheetChange,
  createLegacyCharacterSheetContext,
  isStructuredCharacterSheetPage,
  prepareCharacterSheetContext,
  prepareStructuredCharacterSheetChange,
  readCharacterSheetCharacter
} from './characterSheetCharacter.js';

import {
  advanceEditorPageBase,
  getCurrentEditorPageBase
} from './editorSessionBase.js';

import {
  hasPendingAutosaveForPage
} from './autosave.js';

import {
  setSaveStatus,
  setStatus
} from '../ui/ui.js';


const ABILITY_LABELS = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма'
};

const CHARACTER_SHEET_SKILLS = Object.fromEntries(DND_CHECK_GROUPS.map(group => [group.ability, group.items.map(item => skillRow(item.name, item.name.startsWith('save') ? 'Спасбросок' : item.label))]));

let saveCurrentPageRef =
  null;

const sheetContexts =
  new WeakMap();


// Лист персонажа - runtime-витрина CharacterModel.
// Он не хранит свои числа, а каждый раз собирает картину из свойств,
// инвентаря, эффектов и старых DnD-блоков текущей карточки.
export function setupCharacterSheetBlocks(
  editor,
  saveCurrentPage
) {

  saveCurrentPageRef =
    saveCurrentPage;

  editor.addEventListener(
    'change',
    async event => {

      const control =
        event.target.closest(
          '[data-character-sheet-field], [data-character-sheet-override], [data-character-sheet-death-field]'
        );

      if (!control) return;

      const block =
        control.closest(
          '.character-sheet-block'
        );

      if (!block) return;

      await updateCharacterSheetValue(
        block,
        control
      );
    }
  );

  editor.addEventListener(
    'click',
    async event => {

      const button =
        event.target.closest(
          '[data-character-sheet-clear-override]'
        );

      if (!button) return;

      const block =
        button.closest(
          '.character-sheet-block'
        );

      if (!block) return;

      await clearCharacterSheetOverride(
        block,
        button.dataset.characterSheetClearOverride
      );
    }
  );
}


export function renderCharacterSheetBlocks(
  editor
) {

  const blocks =
    [
      editor.matches?.('.character-sheet-block')
        ? editor
        : null,
      ...editor.querySelectorAll(
        '.character-sheet-block'
      )
    ].filter(Boolean);

  return Promise.all(
    blocks.map(block =>
      renderCharacterSheetBlock(block)
    )
  );
}


function renderCharacterSheetBlock(
  block,
  { refreshContext = false } = {}
) {

  const target =
    ensureRuntimeContainer(
      block
    );

  const page =
    getCurrentPageSnapshot(
      block
    );

  if (
    !page ||
    !['character', 'creature', 'player'].includes(
      page.type
    )
  ) {

    target.innerHTML =
      '<div class="character-sheet-empty">Лист доступен для персонажей и существ.</div>';

    return Promise.resolve(null);
  }

  if (!isStructuredCharacterSheetPage(page)) {
    const context = createLegacyCharacterSheetContext({
      page,
      pages: state.pages
    });
    const source = readCharacterSheetCharacter(page, {
      pages: state.pages,
      context
    });
    if (source.status !== 'ready') {
      target.innerHTML = '<div class="character-sheet-empty" role="status">Legacy Player Sheet недоступен.</div>';
      return Promise.resolve(source);
    }
    sheetContexts.set(block, context);
    target.innerHTML = createCharacterSheetHTML(source.model, page, {
      source: 'legacy'
    });
    return Promise.resolve(source);
  }

  target.innerHTML = '<div class="character-sheet-empty">Загрузка structured-данных…</div>';
  return renderStructuredCharacterSheetBlock(block, target, page, { refreshContext });
}


async function renderStructuredCharacterSheetBlock(
  block,
  target,
  page,
  { refreshContext = false } = {}
) {
  let context = !refreshContext
    ? sheetContexts.get(block)
    : null;
  if (!context || context.pageId !== page.id || context.mode !== 'source-aware') {
    context = await prepareCharacterSheetContext({
      page,
      pages: state.pages
    });
    sheetContexts.set(block, context);
  }
  const source = readCharacterSheetCharacter(page, {
    pages: state.pages,
    context
  });
  if (source.status !== 'ready' || source.source !== 'structured') {
    target.innerHTML = `
      <div class="character-sheet-empty" role="status">
        Structured Character Sheet недоступен. Перезагрузите карточку после проверки catalog/schema.
      </div>
    `;
    return source;
  }
  target.innerHTML = createCharacterSheetHTML(source.model, page, {
    source: 'structured', presentation: source.presentation
  });
  return source;
}


function createCharacterSheetHTML(
  model,
  page,
  { source = 'legacy', presentation = {} } = {}
) {

  const health =
    getCharacterHealth(
      model
    );

  const structured = source === 'structured';
  const player = structured && model.cardType === 'player';
  const properties = structured
    ? null
    : getPrimaryCharacterPropertiesModel(page);

  return `
    <section class="character-sheet-page" data-character-sheet-source="${escapeAttribute(source)}" data-character-sheet-type="${escapeAttribute(model.cardType)}">
      <header class="character-sheet-top">
        <section class="character-sheet-identity character-sheet-box character-sheet-corner-br">
          <span class="character-sheet-kicker">${escapeHTML(player ? 'Игрок / Player' : model.cardType === 'creature' ? 'Существо' : 'Персонаж')}</span>
          <strong>${escapeHTML(getCurrentCharacterTitle(model, page))}</strong>
          <div class="character-sheet-identity-grid">
            ${createReadOnlyLineHTML('Предыстория', structured ? '—' : getPropertyDisplayValue(properties, 'background'))}
            ${createReadOnlyLineHTML('Класс', player ? presentation.identity?.class : structured ? '—' : getPropertyDisplayValue(properties, 'charClass'))}
            ${createReadOnlyLineHTML('Вид', player ? presentation.identity?.race : structured ? '—' : getPropertyDisplayValue(properties, 'race'))}
            ${createReadOnlyLineHTML('Подкласс', player ? presentation.identity?.subclass : structured ? '—' : getPropertyDisplayValue(properties, 'charSubclass'))}
            ${player ? createReadOnlyLineHTML('Подвид', presentation.identity?.subrace) : ''}
          </div>
        </section>

        <section class="character-sheet-level-orb">
          ${createEditableMetricHTML({
            label: 'Уровень',
            value: model.level,
            field: 'level',
            className: 'character-sheet-level',
            editable: !player || presentation.writable?.level === true
          })}
          <div class="character-sheet-pb">БМ ${formatSigned(model.proficiencyBonus)}</div>
        </section>

        <section class="character-sheet-ac-shield">
          ${createEditableMetricHTML({
            label: 'Класс защиты',
            value: getCharacterEffectiveArmorClass(model),
            field: structured ? '' : 'armorClass',
            override: structured ? '' : 'armorClass',
            calculation: model.calculations?.armorClass,
            editable: !structured,
            readOnlyReason: structured ? 'Effective AC редактируется через approved armor source.' : ''
          })}
        </section>

        <section class="character-sheet-vitals character-sheet-box">
          <div class="character-sheet-vitals-grid">
            ${createEditableMetricHTML({
              label: 'Хиты',
              value: health.current,
              field: 'hpCurrent',
              editable: !player || presentation.writable?.health === true
            })}
            ${createEditableMetricHTML({
              label: 'Временные',
              value: health.temp,
              field: 'hpTemp',
              editable: !player || presentation.writable?.health === true
            })}
            ${createEditableMetricHTML({
              label: 'Максимум',
              value: health.max,
              field: 'hpMax',
              editable: !player || presentation.writable?.health === true
            })}
            ${createReadOnlyMetricHTML('Кость хитов', structured ? presentation.hitDice || '—' : getPropertyDisplayValue(properties, 'hitDie') || 'd?')}
            ${createDeathSavesHTML(model, { disabled: structured && presentation.writable?.deathSaves !== true })}
          </div>
        </section>
      </header>

      <section class="character-sheet-logo">Long Story Short</section>

      <section class="character-sheet-survival">
        ${createEditableMetricHTML({
          label: 'Инициатива',
          value: getCharacterInitiativeModifier(model),
          override: structured ? '' : 'initiative',
          calculation: model.calculations?.initiative,
          signed: true,
          editable: !structured,
          readOnlyReason: structured ? 'Effective initiative является calculated value.' : ''
        })}
        ${createEditableMetricHTML({
          label: 'Скорость',
          value: getCharacterEffectiveSpeed(model),
          field: structured ? '' : 'speed',
          override: structured ? '' : 'speed',
          suffix: 'фт.',
          calculation: model.calculations?.speed,
          editable: !structured,
          readOnlyReason: structured ? 'Effective speed зависит от movement rows и Effects.' : ''
        })}
        ${createReadOnlyMetricHTML('П. восприятие', calculatePassivePerception(properties, model))}
        ${createReadOnlyMetricHTML('Состояния', getConditionsLabel(model))}
      </section>

      <main class="character-sheet-main">
        <section class="character-sheet-abilities">
          ${CHARACTER_ABILITY_KEYS.map(key =>
            createAbilityHTML(
              key,
              model.abilities[key],
              properties,
              { structured, player, checksEditable: presentation.writable?.checks === true, editable: !player || presentation.writable?.[key] === true, checks: model.calculations?.checks?.byKey }
            )
          ).join('')}
        </section>

        <section class="character-sheet-side">
          ${createInventoryHTML(model)}
          ${createEffectsHTML(model)}
        </section>
      </main>
    </section>
  `;
}


function createMetricHTML(
  label,
  value
) {

  return `
    <div class="character-sheet-metric">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `;
}


function createEditableMetricHTML(
  {
    label,
    value,
    field = '',
    override = '',
    className = '',
    suffix = '',
    signed = false,
    calculation = null,
    editable = true,
    readOnlyReason = ''
  }
) {

  const isManual =
    calculation?.source === 'manual';

  return `
    <label class="character-sheet-metric ${editable ? 'character-sheet-editable' : 'character-sheet-readonly'} ${className} ${isManual && editable ? 'is-manual-override' : ''}">
      <span>${escapeHTML(label)}</span>
      ${calculation ? createCalculationHintHTML(calculation) : ''}
      <input
        type="number"
        value="${escapeAttribute(value)}"
        ${editable && field ? `data-character-sheet-field="${escapeAttribute(field)}"` : ''}
        ${editable && override ? `data-character-sheet-override="${escapeAttribute(override)}"` : ''}
        ${editable ? '' : 'disabled aria-readonly="true"'}
        title="${escapeAttribute(readOnlyReason || calculation?.formula || '')}"
      >
      ${editable && override && isManual ? `
        <button
          class="character-sheet-clear-override"
          type="button"
          data-character-sheet-clear-override="${escapeAttribute(override)}"
          title="Вернуть авторасчет"
        >×</button>
      ` : ''}
      <strong>${escapeHTML(signed ? formatSigned(value) : value)}</strong>
      ${suffix ? `<small>${escapeHTML(suffix)}</small>` : ''}
    </label>
  `;
}


function createCalculationHintHTML(
  calculation
) {

  const parts =
    (calculation.parts || [])
      .map(part =>
        `${part.label}: ${part.value}`
      )
      .join(' · ');

  const text =
    [
      calculation.source === 'manual'
        ? 'Ручное значение'
        : 'Авторасчет',
      calculation.formula,
      parts
    ]
      .filter(Boolean)
      .join(' | ');

  return `
    <em class="character-sheet-calc-hint" title="${escapeAttribute(text)}">
      ${escapeHTML(calculation.source === 'manual' ? 'ручн.' : 'авто')}
    </em>
  `;
}


function createAbilityHTML(
  key,
  ability,
  properties,
  { structured = false, player = false, checksEditable = false, editable = true, checks = {} } = {}
) {

  return `
    <article class="character-sheet-ability character-sheet-box">
      <h3>${escapeHTML(ABILITY_LABELS[key])}</h3>
      <div class="character-sheet-ability-main">
        <span class="character-sheet-ability-mod">${formatSigned(ability.modifier)}</span>
        <label class="character-sheet-ability-score character-sheet-editable">
          <input
            type="number"
            min="1" max="30"
            ${editable ? '' : 'disabled readonly'}
            value="${escapeAttribute(ability.score)}"
            data-character-sheet-field="${escapeAttribute(key)}"
          >
          <span>Значение</span>
        </label>
      </div>
      <div class="character-sheet-skill-list">
        ${createSkillRowsHTML(
          key,
          properties,
          ability,
          { structured, player, checksEditable, checks }
        )}
      </div>
    </article>
  `;
}


function createSkillRowsHTML(
  abilityKey,
  properties,
  ability,
  { structured = false, player = false, checksEditable = false, checks = {} } = {}
) {

  return (
    CHARACTER_SHEET_SKILLS[abilityKey] || []
  )
    .map(skill => {

      const value = structured
        ? (checks[skill.key]?.value ?? '—')
        : getNumericPropertyValue(
          properties,
          skill.key,
          ability.modifier
        );

      const proficient = structured
        ? checks[skill.key]?.proficient === true
        : Boolean(
          getPropertyValue(
            properties,
            `${skill.key}Proficient`,
            false
          )
        );

      const writable = structured && checksEditable && (!skill.key.startsWith('save') || player);
      return `
        <div class="character-sheet-skill${structured && !writable ? ' character-sheet-readonly' : ''}" data-character-sheet-check="${escapeAttribute(skill.key)}"${structured ? ` title="${checks[skill.key] ? 'Calculated Entity value.' : 'Structured gameplay unavailable.'}"` : ''}>
          <span class="character-sheet-skill-dot ${proficient ? 'is-active' : ''}${checks[skill.key]?.expertise ? ' is-expertise' : ''}"${structured ? ` role="img" aria-label="${checks[skill.key]?.expertise ? 'Экспертиза' : proficient ? 'Владение' : 'Без владения'}"` : ''}></span>
          <strong>${value === '—' ? value : formatSigned(value)}</strong>
          <span>${escapeHTML(skill.label)}</span>
          ${writable ? createCheckControlsHTML(skill, checks[skill.key]) : ''}
        </div>
      `;
    })
    .join('');
}


function createInventoryHTML(
  model
) {

  const items =
    model.inventory.items.length
      ? model.inventory.items.map(item => `
        <li>
          <span>${escapeHTML(item.title)}</span>
          <strong>${escapeHTML(item.quantity ?? 1)}</strong>
        </li>
      `).join('')
      : '<li class="is-empty">Предметов нет</li>';

  return `
    <div class="character-sheet-panel">
      <h3>Инвентарь</h3>
      <ul>${items}</ul>
    </div>
  `;
}


function createDeathSavesHTML(
  model,
  { disabled = false } = {}
) {

  return `
    <div class="character-sheet-death-saves">
      <span>Хиты от смерти</span>
      ${createDeathSaveTrackHTML({
        label: 'Успехи',
        icon: '♥',
        field: 'deathSaveSuccesses',
        value: model.deathSaves?.successes || 0, disabled
      })}
      ${createDeathSaveTrackHTML({
        label: 'Провалы',
        icon: '☠',
        field: 'deathSaveFailures',
        value: model.deathSaves?.failures || 0, disabled
      })}
    </div>
  `;
}


function createReadOnlyLineHTML(
  label,
  value
) {

  return `
    <div class="character-sheet-line">
      <span>${escapeHTML(value || '—')}</span>
      <small>${escapeHTML(label)}</small>
    </div>
  `;
}


function createReadOnlyMetricHTML(
  label,
  value
) {

  return `
    <div class="character-sheet-metric character-sheet-readonly">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value ?? '—')}</strong>
    </div>
  `;
}


function createDeathSaveTrackHTML(
  {
    label,
    icon,
    field,
    value,
    disabled = false
  }
) {

  return `
    <fieldset class="character-sheet-death-track" data-character-sheet-death-track="${escapeAttribute(field)}">
      <legend>${escapeHTML(label)}</legend>
      ${[1, 2, 3].map(index => `
        <label>
          <input
            type="checkbox"
            ${disabled ? 'disabled' : ''}
            ${index <= value ? 'checked' : ''}
            data-character-sheet-death-field="${escapeAttribute(field)}"
            data-character-sheet-death-index="${index}"
          >
          <span>${escapeHTML(icon)}</span>
        </label>
      `).join('')}
    </fieldset>
  `;
}


function createEffectsHTML(
  model
) {

  const conditionItems =
    model.effects.conditions.map(condition => `
      <li>${escapeHTML(condition.level ? `${condition.label} ${condition.level}` : condition.label)}</li>
    `);

  const effectItems =
    model.effects.effects.map(effect => `
      <li>${escapeHTML(effect.title)}</li>
    `);

  const items =
    [
      ...conditionItems,
      ...effectItems
    ];

  return `
    <div class="character-sheet-panel">
      <h3>Эффекты</h3>
      <ul>${items.length ? items.join('') : '<li class="is-empty">Эффектов нет</li>'}</ul>
    </div>
  `;
}


function ensureRuntimeContainer(
  block
) {

  const existing =
    block.querySelector(
      '.character-sheet-runtime'
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
    'character-sheet-runtime';

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


function getCurrentPageSnapshot(
  block
) {

  const editor =
    block.closest(
      '#editorArea'
    );

  if (!state.currentPage) return null;

  if (isStructuredCharacterSheetPage(state.currentPage)) {
    return state.currentPage;
  }

  return {
    ...state.currentPage,
    content:
      editor?.innerHTML ||
      state.currentPage.content ||
      ''
  };
}


async function updateCharacterSheetValue(
  block,
  control
) {

  const editor =
    block.closest(
      '#editorArea'
    );

  if (!editor || !state.currentPage) return;
  if (state.currentPage.type === 'player' && !isStructuredCharacterSheetPage(state.currentPage)) return;

  if (isStructuredCharacterSheetPage(state.currentPage)) {
    await updateStructuredCharacterSheetValue(block, control, editor);
    return;
  }

  const propertiesBlock =
    ensurePropertiesBlockForPage(
      editor,
      state.currentPage
    );

  if (!propertiesBlock) return;

  const field =
    control.dataset.characterSheetField;

  const override =
    control.dataset.characterSheetOverride;

  const deathField =
    control.dataset.characterSheetDeathField;

  const value =
    deathField
      ? getDeathSaveTrackNextValue(
        control
      )
      : control.value;

  let changed =
    false;

  if (field) {

    changed =
      setPropertyFieldValue(
        propertiesBlock,
        field,
        value
      ) || changed;
  }

  if (override) {

    changed =
      setCalculatedPropertyOverride(
        propertiesBlock,
        override,
        value
      ) || changed;
  }

  if (deathField) {

    changed =
      setPropertyFieldValue(
        propertiesBlock,
        deathField,
        value
      ) || changed;
  }

  if (!changed) return;

  notifyPropertiesInput(
    propertiesBlock
  );

  await saveCurrentPageRef?.();

  renderCharacterSheetBlock(
    block
  );
}


async function updateStructuredCharacterSheetValue(
  block,
  control,
  editor
) {
  const page = state.currentPage;
  const field = control.dataset.characterSheetField || control.dataset.characterSheetDeathField;
  if (!page || !field) return;

  if (hasPendingAutosaveForPage(page.id)) {
    setSaveStatus('conflict', 'Сначала сохраните изменения текста карточки.');
    setStatus('Structured Sheet write blocked: editor body has pending changes.');
    await renderCharacterSheetBlock(block);
    return;
  }

  let context = sheetContexts.get(block);
  const expectedBase = getCurrentEditorPageBase(page.id);
  if (!context || context.mode !== 'source-aware' || !expectedBase?.stateHash) {
    setSaveStatus('error', 'Structured Character source недоступен.');
    await renderCharacterSheetBlock(block, { refreshContext: true });
    return;
  }

  let plan;
  try {
    validateStructuredCharacterSheetInput(field, control.dataset.characterSheetDeathField ? getDeathSaveTrackNextValue(control) : control.type === 'checkbox' ? control.checked : control.value);
    if (page.type === 'character' && (checkField(field) || control.dataset.characterSheetDeathField)) {
      await ensureCharacterGameplayCatalog(context);
      context = await prepareCharacterSheetContext({ page, pages: state.pages });
      sheetContexts.set(block, context);
    }
    // Catalog/context preparation yields; do not race a new body draft or navigation.
    if (state.currentPage?.id !== page.id || hasPendingAutosaveForPage(page.id)) {
      throw new Error('Editor page/body changed during Sheet preparation');
    }
    plan = prepareStructuredCharacterSheetChange({
      page,
      field,
      value: control.dataset.characterSheetDeathField ? getDeathSaveTrackNextValue(control) : control.type === 'checkbox' ? control.checked : control.value,
      expectedBase,
      pages: state.pages,
      context
    });
  } catch (error) {
    setSaveStatus('error', `Значение не сохранено: ${error.reason || error.message || error}`);
    await renderCharacterSheetBlock(block, { refreshContext: true });
    return;
  }

  setSaveStatus('saving');
  const result = await commitStructuredCharacterSheetChange(plan);
  if (!['saved', 'unchanged'].includes(result.status)) {
    setSaveStatus(
      result.status === 'uncertain' ? 'error' : 'conflict',
      result.status === 'uncertain'
        ? 'Значение записано не полностью подтверждённо. Перезагрузите карточку.'
        : 'Structured Sheet write заблокирован: page/schema/workspace изменились.'
    );
    await renderCharacterSheetBlock(block, { refreshContext: true });
    return;
  }

  advanceEditorPageBase(page, page.content);
  try {
    await renderCharacterSheetBlock(block);
    setSaveStatus('Сохранено');
    setStatus(result.status === 'saved' ? 'Character Sheet сохранён' : 'Значение не изменилось');
  } catch (error) {
    setSaveStatus('error', 'Значение сохранено, но Sheet не удалось обновить.');
    console.error('Character Sheet refresh failed after durable write', error);
  }
}


async function clearCharacterSheetOverride(
  block,
  key
) {

  if (!key) return;

  const editor =
    block.closest(
      '#editorArea'
    );

  if (!editor || !state.currentPage) return;

  if (isStructuredCharacterSheetPage(state.currentPage)) {
    await renderCharacterSheetBlock(block);
    return;
  }
  if (state.currentPage.type === 'player') return;

  const propertiesBlock =
    ensurePropertiesBlockForPage(
      editor,
      state.currentPage
    );

  if (!propertiesBlock) return;

  const changed =
    setCalculatedPropertyOverride(
      propertiesBlock,
      key,
      ''
    );

  if (!changed) return;

  notifyPropertiesInput(
    propertiesBlock
  );

  await saveCurrentPageRef?.();

  renderCharacterSheetBlock(
    block
  );
}


function getDeathSaveTrackNextValue(
  control
) {

  const index =
    Number(
      control.dataset.characterSheetDeathIndex
    ) || 0;

  return control.checked
    ? index
    : Math.max(
      0,
      index - 1
    );
}


function getPrimaryCharacterPropertiesModel(
  page
) {

  return readPropertiesModelsFromHTML(
    page?.content || ''
  )
    .find(properties =>
      properties.cardType === 'character' ||
      properties.cardType === 'creature'
    ) || null;
}


function getCurrentCharacterTitle(
  model,
  page
) {

  return page?.title ||
    state.pages.find(item =>
      item.id === model.pageId
    )?.title ||
    'Без имени';
}


function getPropertyDisplayValue(
  properties,
  key
) {

  const value =
    getPropertyValue(
      properties,
      key,
      ''
    );

  if (
    value === null ||
    value === undefined ||
    value === false
  ) return '';

  return String(value);
}


function getNumericPropertyValue(
  properties,
  key,
  fallback = 0
) {

  const rawValue =
    getPropertyValue(
      properties,
      key,
      fallback
    );

  if (
    rawValue === '' ||
    rawValue === null ||
    rawValue === undefined
  ) return fallback;

  const value =
    Number(
      rawValue
    );

  return Number.isFinite(value)
    ? value
    : fallback;
}


function calculatePassivePerception(
  properties,
  model
) {
  if (model.source === 'entity') {
    const perception = model.calculations?.checks?.byKey?.skillPerception?.value;
    return Number.isFinite(perception) ? 10 + perception : '—';
  }

  const perception =
    getNumericPropertyValue(
      properties,
      'skillPerception',
      model.abilities?.wis?.modifier || 0
    );

  return 10 + perception;
}


function getConditionsLabel(
  model
) {

  const count =
    (model.effects?.conditions || []).length +
    (model.effects?.effects || []).length;

  return count > 0
    ? `${count} акт.`
    : 'нет';
}


function skillRow(
  key,
  label
) {

  return {
    key,
    label
  };
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
  );
}

function createCheckControlsHTML(skill, check) {
  const checkbox = (member, label) => `<label title="${escapeAttribute(label)}"><input type="checkbox" data-character-sheet-field="${escapeAttribute(`${skill.key}.${member}`)}" aria-label="${escapeAttribute(`${skill.label}: ${label}`)}" ${check?.inputs?.[member] ? 'checked' : ''}>${escapeHTML(label)}</label>`;
  return `<span class="character-sheet-check-controls">${checkbox('proficient', 'Владение')}${skill.key.startsWith('skill') ? checkbox('expertise', 'Экспертиза') : ''}<label>Бонус<input type="number" step="any" value="${escapeAttribute(check?.bonus || 0)}" data-character-sheet-field="${escapeAttribute(`${skill.key}.bonus`)}" aria-label="${escapeAttribute(`${skill.label}: Бонус`)}"></label></span>`;
}
