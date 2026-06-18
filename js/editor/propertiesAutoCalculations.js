import {
  calculateDndAbilityModifier,
  calculateDndArmorClass,
  calculateDndCheckValue,
  calculateDndProficiencyBonus
} from '../properties/propertiesCalculationEngine.js';

import {
  DND_SKILL_GROUPS
} from '../properties/propertySchemas.js';

import {
  readPropertiesModelsFromHTML
} from '../properties/propertiesModel.js';

import {
  state
} from '../state.js';


const AUTO_WRITE_FLAG =
  'propertyAutoWriting';


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
    .forEach(block =>
      recalculatePropertiesBlock(
        block
      )
    );
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

  recalculateSkillFields(
    block
  );

  recalculateArmorClassField(
    block
  );
}


function recalculateSkillFields(
  block
) {

  const level =
    readNumber(
      block,
      'level',
      1
    );

  const proficiencyBonus =
    calculateDndProficiencyBonus(
      level
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

  const normalized =
    normalizeLookup(
      reference
    );

  const page =
    state.pages.find(candidate => {

      if (candidate.type !== 'item') return false;

      return [
        candidate.id,
        candidate.title,
        ...(candidate.aliases || [])
      ].some(value =>
        normalizeLookup(
          value
        ) === normalized
      );
    });

  if (!page) return null;

  const model =
    readPropertiesModelsFromHTML(
      page.content
    ).find(item =>
      item.cardType === 'item'
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
    DND_SKILL_GROUPS.some(group =>
      (group.items || []).some(item =>
        item.name === name
      )
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


function normalizeLookup(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
