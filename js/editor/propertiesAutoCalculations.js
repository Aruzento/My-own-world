import {
  calculateDndAbilityModifier,
  calculateDndArmorClass,
  calculateDndCheckValue,
  calculateDndProficiencyBonus,
  findArmorItemPage,
  getArmorItemPages,
  getArmorPageProperties
} from '../properties/propertiesCalculationEngine.js';

import {
  DND_SKILL_GROUPS
} from '../properties/propertySchemas.js';

import {
  state
} from '../state.js';


const AUTO_WRITE_FLAG =
  'propertyAutoWriting';

const ABILITY_KEYS = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
];


// Runtime-авторасчет не является источником истины сам по себе.
// Он только заполняет видимые поля блока "Свойства", чтобы пользователь сразу
// видел результат DnD-формул. Модельный расчет остается в CharacterModel.
export function setupPropertiesAutoCalculations(
  editor
) {

  if (
    editor.dataset.propertiesAutoCalculationsReady === 'true'
  ) return;

  editor.dataset.propertiesAutoCalculationsReady =
    'true';

  editor.addEventListener(
    'input',
    event => {

      handlePropertyCalculationEvent(
        event
      );
    }
  );

  editor.addEventListener(
    'change',
    event => {

      handlePropertyCalculationEvent(
        event
      );
    }
  );
}


export function refreshPropertiesAutoCalculations(
  root
) {

  root
    .querySelectorAll?.('.card-properties-block[data-block-type="properties"]')
    .forEach(block => {

      populateArmorItemSelect(
        block
      );

      recalculatePropertiesBlock(
        block
      );
    });
}


function handlePropertyCalculationEvent(
  event
) {

  const control =
    event.target.closest?.(
      '[data-property-name]'
    );

  if (!control) return;

  const block =
    control.closest(
      '.card-properties-block[data-block-type="properties"]'
    );

  if (!block) return;

  if (
    control.dataset[AUTO_WRITE_FLAG] === 'true'
  ) return;

  updateManualState(
    control
  );

  recalculatePropertiesBlock(
    block
  );
}


function updateManualState(
  control
) {

  const name =
    control.dataset.propertyName;

  if (
    !isCalculatedPropertyName(
      name
    )
  ) return;

  if (
    control.type === 'checkbox'
  ) return;

  const isEmpty =
    String(control.value ?? '').trim() === '';

  control.dataset.propertyManual =
    isEmpty
      ? 'false'
      : 'true';

  control.closest('.card-property-field, .card-property-skill-row')
    ?.classList
    .toggle(
      'is-manual-override',
      !isEmpty
    );
}


function recalculatePropertiesBlock(
  block
) {

  const cardType =
    block.dataset.cardType || '';

  if (
    cardType !== 'character' &&
    cardType !== 'creature'
  ) return;

  recalculateAbilityModifierBadges(
    block
  );

  recalculateProficiencyBonusField(
    block
  );

  recalculateInitiativeField(
    block
  );

  recalculateSkillFields(
    block
  );

  recalculateArmorClassField(
    block
  );
}


function recalculateAbilityModifierBadges(
  block
) {

  ABILITY_KEYS.forEach(key => {

    const control =
      getControl(
        block,
        key
      );

    const field =
      control?.closest(
        '.card-property-field'
      );

    if (!field) return;

    const modifier =
      calculateDndAbilityModifier(
        readNumber(
          block,
          key,
          10
        )
      );

    let badge =
      field.querySelector(
        '.card-property-ability-modifier[data-runtime="true"]'
      );

    if (!badge) {

      badge =
        document.createElement('span');

      badge.className =
        'card-property-ability-modifier';

      badge.dataset.runtime =
        'true';

      badge.setAttribute(
        'contenteditable',
        'false'
      );

      const label =
        field.querySelector(
          '.card-property-label, span'
        );

      if (label?.nextSibling) {

        field.insertBefore(
          badge,
          label.nextSibling
        );

      } else {

        field.insertBefore(
          badge,
          control
        );
      }
    }

    badge.textContent =
      formatSigned(
        modifier
      );

    badge.title =
      'Модификатор';

    badge.dataset.modifierValue =
      String(
        modifier
      );
  });
}


function recalculateProficiencyBonusField(
  block
) {

  const control =
    getControl(
      block,
      'proficiencyBonus'
    );

  if (
    !control ||
    isManualControl(
      control
    )
  ) return;

  writeAutoValue(
    control,
    calculateDndProficiencyBonus(
      readNumber(
        block,
        'level',
        1
      )
    )
  );
}


function recalculateInitiativeField(
  block
) {

  const control =
    getControl(
      block,
      'initiative'
    );

  if (
    !control ||
    isManualControl(
      control
    )
  ) return;

  writeAutoValue(
    control,
    calculateDndAbilityModifier(
      readNumber(
        block,
        'dex',
        10
      )
    )
  );
}


function recalculateSkillFields(
  block
) {

  const proficiencyBonus =
    readEffectiveProficiencyBonus(
      block
    );

  DND_SKILL_GROUPS.forEach(group => {

    const abilityModifier =
      calculateDndAbilityModifier(
        readNumber(
          block,
          group.ability,
          10
        )
      );

    (group.items || [])
      .forEach(item => {

        const control =
          getControl(
            block,
            item.name
          );

        if (
          !control ||
          isManualControl(
            control
          )
        ) return;

        writeAutoValue(
          control,
          calculateDndCheckValue({
            abilityModifier,
            proficiencyLevel:
              readProficiencyLevel(
                block,
                item.proficientName
              ),
            proficiencyBonus
          })
        );
      });
  });
}


function readEffectiveProficiencyBonus(
  block
) {

  const calculated =
    calculateDndProficiencyBonus(
      readNumber(
        block,
        'level',
        1
      )
    );

  const control =
    getControl(
      block,
      'proficiencyBonus'
    );

  if (!control) return calculated;

  return readNumber(
    block,
    'proficiencyBonus',
    calculated
  );
}


function recalculateArmorClassField(
  block
) {

  const control =
    getControl(
      block,
      'armorClass'
    );

  if (
    !control ||
    isManualControl(
      control
    )
  ) return;

  const armor =
    resolveSelectedArmor(
      block
    );

  writeAutoValue(
    control,
    calculateDndArmorClass({
      dexModifier:
        calculateDndAbilityModifier(
          readNumber(
            block,
            'dex',
            10
          )
        ),
      armorKind:
        armor?.armorKind || 'Нет',
      armorBaseAc:
        armor?.armorBaseAc ?? '',
      armorDexMax:
        armor?.armorDexMax ?? ''
    })
  );
}


function resolveSelectedArmor(
  block
) {

  const reference =
    readValue(
      block,
      'armorItem'
    );

  if (!reference) return null;

  const page =
    findArmorItemPage(
      state.pages,
      reference
    );

  if (!page) return null;

  const model =
    getArmorPageProperties(
      page
    );

  return {
    armorKind:
      model?.values?.armorKind || 'Нет',
    armorBaseAc:
      model?.values?.armorBaseAc || '',
    armorDexMax:
      model?.values?.armorDexMax || ''
  };
}


function populateArmorItemSelect(
  block
) {

  const cardType =
    block.dataset.cardType || '';

  if (
    cardType !== 'character' &&
    cardType !== 'creature'
  ) return;

  const select =
    getControl(
      block,
      'armorItem'
    );

  if (
    !select ||
    select.tagName !== 'SELECT'
  ) return;

  const previousValue =
    readValue(
      block,
      'armorItem'
    );

  const armorPages =
    getArmorItemPages(
      state.pages
    )
      .slice()
      .sort(comparePageTitles);

  const selectedArmor =
    findArmorItemPage(
      armorPages,
      previousValue
    );

  select.innerHTML =
    '';

  appendOption(
    select,
    '',
    'Без доспеха',
    {
      selected:
        !previousValue
    }
  );

  armorPages.forEach(page => {

    const value =
      page.id ||
      page.title ||
      '';

    if (!value) return;

    appendOption(
      select,
      value,
      formatArmorOptionLabel(
        page
      ),
      {
        selected:
          selectedArmor === page
      }
    );
  });

  if (
    previousValue &&
    !selectedArmor
  ) {

    appendOption(
      select,
      previousValue,
      `Недоступно: ${previousValue}`,
      {
        disabled:
          true,
        selected:
          true
      }
    );

    select.title =
      'Этот предмет не имеет типа доспеха в блоке "Свойства" карточки предмета.';

  } else {

    select.title =
      'Показываются только предметы, у которых в "Свойствах" выбран тип доспеха.';
  }

  if (
    selectedArmor
  ) {

    select.value =
      selectedArmor.id ||
      selectedArmor.title ||
      '';
  }
}


function appendOption(
  select,
  value,
  label,
  {
    disabled = false,
    selected = false
  } = {}
) {

  const option =
    document.createElement(
      'option'
    );

  option.value =
    String(value ?? '');

  option.textContent =
    String(label ?? value ?? '');

  option.disabled =
    disabled;

  option.selected =
    selected;

  select.appendChild(
    option
  );
}


function formatArmorOptionLabel(
  page
) {

  const properties =
    getArmorPageProperties(
      page
    );

  const kind =
    properties?.values?.armorKind || '';

  const baseAc =
    properties?.values?.armorBaseAc || '';

  const suffix = [
    kind,
    baseAc
      ? `КЗ ${baseAc}`
      : ''
  ]
    .filter(Boolean)
    .join(', ');

  return suffix
    ? `${page.title || page.id} (${suffix})`
    : (page.title || page.id || 'Предмет');
}


function comparePageTitles(
  left,
  right
) {

  return String(left?.title || left?.id || '')
    .localeCompare(
      String(right?.title || right?.id || ''),
      'ru',
      {
        sensitivity: 'base'
      }
    );
}


function writeAutoValue(
  control,
  value
) {

  control.dataset[AUTO_WRITE_FLAG] =
    'true';

  control.value =
    String(value);

  control.setAttribute(
    'value',
    String(value)
  );

  control.dataset.propertyManual =
    'false';

  control.closest('.card-property-field, .card-property-skill-row')
    ?.classList
    .remove(
      'is-manual-override'
    );

  delete control.dataset[AUTO_WRITE_FLAG];
}


function isCalculatedPropertyName(
  name
) {

  return name === 'armorClass' ||
    name === 'proficiencyBonus' ||
    name === 'initiative' ||
    DND_SKILL_GROUPS.some(group =>
      (group.items || []).some(item =>
        item.name === name
      )
    );
}


function formatSigned(
  value
) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) return '+0';

  const rounded =
    Math.floor(
      number
    );

  return rounded >= 0
    ? `+${rounded}`
    : String(
      rounded
    );
}


function isManualControl(
  control
) {

  return control.dataset.propertyManual === 'true' &&
    String(control.value ?? '').trim() !== '';
}


function readNumber(
  block,
  key,
  fallback
) {

  const value =
    Number(
      readValue(
        block,
        key
      )
    );

  return Number.isFinite(value)
    ? value
    : fallback;
}


function readProficiencyLevel(
  block,
  key
) {

  const control =
    getControl(
      block,
      key
    );

  if (!control) return 0;

  if (
    control.type === 'checkbox'
  ) {

    return control.checked
      ? 1
      : 0;
  }

  const value =
    Number(
      control.value ||
      control.dataset.skillProficiencyLevel ||
      0
    );

  return Number.isFinite(value)
    ? Math.max(
      0,
      Math.min(
        2,
        value
      )
    )
    : 0;
}


function readValue(
  block,
  key
) {

  const control =
    getControl(
      block,
      key
    );

  return String(
    control?.value ||
    control?.getAttribute('value') ||
    ''
  ).trim();
}


function getControl(
  block,
  key
) {

  return block.querySelector(
    `[data-property-name="${CSS.escape(key)}"]`
  );
}
