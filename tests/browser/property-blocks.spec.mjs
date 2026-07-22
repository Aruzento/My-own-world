import {
  expect,
  test
} from '@playwright/test';


test(
  'property-block-picker-is-limited-by-card-type',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getVisibleBlockTypesForCardType,
            renderTypePicker
          } = await import('/js/editor/blocks/blockPopupViews.js');

          const popup =
            document.createElement('div');

          popup.innerHTML = `
            <div class="block-popup-title"></div>
            <div class="block-popup-body"></div>
            <div class="block-popup-actions"></div>
          `;

          renderTypePicker(
            popup,
            'item'
          );

          const itemTypes =
            [...popup.querySelectorAll('.block-type-option')]
              .map(option => option.dataset.blockType);

          renderTypePicker(
            popup,
            'location'
          );

          const locationTypes =
            [...popup.querySelectorAll('.block-type-option')]
              .map(option => option.dataset.blockType);

          renderTypePicker(
            popup,
            'note'
          );

          const noteTypes =
            [...popup.querySelectorAll('.block-type-option')]
              .map(option => option.dataset.blockType);

          return {
            itemTypes,
            itemVisibleTypes:
              getVisibleBlockTypesForCardType(
                'item'
              ),
            locationTypes,
            locationVisibleTypes:
              getVisibleBlockTypesForCardType(
                'location'
              ),
            noteTypes,
            noteVisibleTypes:
              getVisibleBlockTypesForCardType(
                'note'
              )
          };
        }
      );

    expect(
      result.itemTypes
    ).toEqual(
      [
        'text',
        'list',
        'table',
        'image',
        'properties'
      ]
    );

    expect(
      result.itemVisibleTypes
    ).toEqual(
      result.itemTypes
    );

    expect(
      result.locationTypes
    ).toEqual(
      [
        'text',
        'list',
        'table',
        'image',
        'properties'
      ]
    );

    expect(
      result.locationVisibleTypes
    ).toEqual(
      result.locationTypes
    );

    expect(
      result.noteTypes
    ).toEqual(
      [
        'text',
        'list',
        'table',
        'image'
      ]
    );

    expect(
      result.noteVisibleTypes
    ).toEqual(
      result.noteTypes
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'characterEffects'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'items'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'spells'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'skills'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'characterStats'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'dndStats'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'characterSheet'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'taskTracker'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'template'
    );
  }
);


test(
  'add-block-picker-uses-design-system-icons-and-focus-states',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            renderTypePicker
          } = await import('/js/editor/blocks/blockPopupViews.js');

          const popup =
            document.createElement('div');

          popup.className =
            'block-popup';

          popup.innerHTML = `
            <div class="block-popup-title"></div>
            <div class="block-popup-body"></div>
            <div class="block-popup-actions"></div>
          `;

          document.body.appendChild(
            popup
          );

          renderTypePicker(
            popup,
            'item'
          );

          const firstOption =
            popup.querySelector('.block-type-option');

          firstOption.focus();

          const firstOptionStyle =
            getComputedStyle(
              firstOption
            );

          const iconNames =
            [...popup.querySelectorAll('.block-type-icon-svg')]
              .map(icon => icon.dataset.iconName);

          const iconText =
            [...popup.querySelectorAll('.block-type-icon')]
              .map(icon => icon.textContent.trim())
              .filter(Boolean);

          const options =
            [...popup.querySelectorAll('.block-type-option')]
              .map(option => ({
                type: option.dataset.blockType,
                role: option.getAttribute('role'),
                label: option.getAttribute('aria-label'),
                group:
                  option.querySelector('.block-type-group')?.textContent || ''
              }));

          return {
            title:
              popup.querySelector('.block-popup-title').textContent,
            view:
              popup.dataset.blockPopupView,
            pickerRole:
              popup.querySelector('.block-type-picker')?.getAttribute('role'),
            actionsHidden:
              popup
                .querySelector('.block-popup-actions')
                .classList
                .contains('hidden'),
            optionTypes:
              options.map(option => option.type),
            optionRoles:
              options.map(option => option.role),
            optionLabels:
              options.map(option => option.label),
            optionGroups:
              options.map(option => option.group),
            iconNames,
            iconText,
            firstOutline:
              firstOptionStyle.outlineStyle,
            firstBorderRadius:
              firstOptionStyle.borderRadius
          };
        }
      );

    expect(
      result.title
    ).toBe(
      'Добавить блок'
    );

    expect(
      result.view
    ).toBe(
      'type-picker'
    );

    expect(
      result.pickerRole
    ).toBe(
      'listbox'
    );

    expect(
      result.actionsHidden
    ).toBe(
      true
    );

    expect(
      result.optionTypes
    ).toEqual(
      [
        'text',
        'list',
        'table',
        'image',
        'properties'
      ]
    );

    expect(
      result.optionRoles
    ).toEqual(
      [
        'option',
        'option',
        'option',
        'option',
        'option'
      ]
    );

    expect(
      result.optionLabels.every(Boolean)
    ).toBe(
      true
    );

    expect(
      result.optionGroups
    ).toEqual(
      [
        'Текст',
        'Списки',
        'Структура',
        'Медиа',
        'Метаданные'
      ]
    );

    expect(
      result.iconNames
    ).toEqual(
      [
        'document',
        'task-tracker',
        'grid',
        'image',
        'settings'
      ]
    );

    expect(
      result.iconText
    ).toEqual(
      []
    );

    expect(
      result.firstOutline
    ).not.toBe(
      'none'
    );

    expect(
      Number.parseFloat(
        result.firstBorderRadius
      )
    ).toBeLessThanOrEqual(
      8
    );
  }
);


test(
  'character-properties-render-grouped-dnd-skills',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            getPropertyNumber,
            getPropertyValue,
            readPropertiesModelFromElement
          } = await import('/js/properties/propertiesModel.js');

          const host =
            document.createElement('div');

          host.innerHTML =
            createPropertiesBlock({
              cardType: 'character'
            });

          const block =
            host.querySelector('[data-block-type="properties"]');

          block.querySelector('[data-property-name="skillAthletics"]').value =
            '5';

          block.querySelector('[data-property-name="skillAthleticsProficient"]').value =
            '1';

          const model =
            readPropertiesModelFromElement(
              block
            );

          return {
            groups:
              [...block.querySelectorAll('[data-property-group-name]')]
                .map(group => group.dataset.propertyGroupName),
            labels:
              [...block.querySelectorAll('.card-property-skill-row span')]
                .map(label => label.textContent.trim()),
            skillAthletics:
              getPropertyNumber(
                model,
                'skillAthletics',
                0
              ),
            skillAthleticsProficient:
              getPropertyValue(
                model,
                'skillAthleticsProficient',
                false
              )
          };
        }
      );

    expect(
      result.groups
    ).toEqual(
      [
        'strSkills',
        'dexSkills',
        'conSkills',
        'intSkills',
        'wisSkills',
        'chaSkills'
      ]
    );

    expect(
      result.labels
    ).toContain(
      'Атлетика'
    );

    expect(
      result.labels
    ).toContain(
      'Скрытность'
    );

    expect(
      result.skillAthletics
    ).toBe(
      5
    );

    expect(
      result.skillAthleticsProficient
    ).toBe(
      '1'
    );
  }
);


test(
  'character-properties-default-layout-is-readable-after-runtime-setup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const editor =
            document.querySelector('#editorArea');

          editor.style.width =
            '960px';

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'character'
            });

          applyBlockSystemContract(
            editor
          );

          const block =
            editor.querySelector('.card-properties-block');

          function field(
            name
          ) {

            return block.querySelector(
              `.card-property-field[data-property-id="${name}"]`
            );
          }

          function layout(
            name
          ) {

            const node =
              field(
                name
              );

            return {
              gridColumn:
                node.style.gridColumn,
              gridRow:
                node.style.gridRow,
              span:
                node.dataset.propertySpan,
              rows:
                node.dataset.propertyRows
            };
          }

          const dexSkillColumns =
            window
              .getComputedStyle(
                field('dexSkills')
                  .querySelector('.card-property-skill-list')
              )
              .gridTemplateColumns
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .length;

          return {
            level:
              layout('level'),
            proficiencyBonus:
              layout('proficiencyBonus'),
            initiative:
              layout('initiative'),
            armorItem:
              layout('armorItem'),
            str:
              layout('str'),
            cha:
              layout('cha'),
            dexSkills:
              layout('dexSkills'),
            dexSkillColumns
          };
        }
      );

    expect(
      result.level
    ).toEqual({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 1',
      span: '2',
      rows: '1'
    });

    expect(
      result.armorItem
    ).toEqual({
      gridColumn: '1 / span 4',
      gridRow: '2 / span 1',
      span: '4',
      rows: '1'
    });

    expect(
      result.proficiencyBonus
    ).toEqual({
      gridColumn: '3 / span 2',
      gridRow: '1 / span 1',
      span: '2',
      rows: '1'
    });

    expect(
      result.initiative
    ).toEqual({
      gridColumn: '5 / span 2',
      gridRow: '1 / span 1',
      span: '2',
      rows: '1'
    });

    expect(
      result.str.gridRow
    ).toBe(
      '3 / span 2'
    );

    expect(
      result.cha.gridColumn
    ).toBe(
      '11 / span 2'
    );

    expect(
      result.dexSkills
    ).toEqual({
      gridColumn: '5 / span 4',
      gridRow: '5 / span 4',
      span: '4',
      rows: '4'
    });

    expect(
      result.dexSkillColumns
    ).toBe(
      1
    );
  }
);


test(
  'item-properties-default-layout-is-readable-after-runtime-setup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const editor =
            document.querySelector('#editorArea');

          editor.style.width =
            '960px';

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          const block =
            editor.querySelector('.card-properties-block');

          function layout(
            name
          ) {

            const node =
              block.querySelector(
                `.card-property-field[data-property-id="${name}"]`
              );

            const label =
              node.querySelector(
                'span'
              );

            const control =
              node.querySelector(
                'input, select, .card-property-textarea'
              );

            const nodeRect =
              node.getBoundingClientRect();

            const labelRect =
              label.getBoundingClientRect();

            const controlRect =
              control.getBoundingClientRect();

            const contentTop =
              Math.min(
                labelRect.top,
                controlRect.top
              );

            const contentBottom =
              Math.max(
                labelRect.bottom,
                controlRect.bottom
              );

            const resizeDot =
              node.querySelector(
                '.card-property-resize-dot-e'
              );

            return {
              gridColumn:
                node.style.gridColumn,
              gridRow:
                node.style.gridRow,
              span:
                node.dataset.propertySpan,
              rows:
                node.dataset.propertyRows,
              width:
                Math.round(
                  nodeRect.width
                ),
              labelWidth:
                Math.round(
                  labelRect.width
                ),
              labelHeight:
                Math.round(
                  labelRect.height
                ),
              labelTopGap:
                Math.round(
                  labelRect.top - nodeRect.top
                ),
              labelBeforeControl:
                labelRect.bottom <= controlRect.top,
              controlHeight:
                Math.round(
                  controlRect.height
                ),
              controlBottomInside:
                controlRect.bottom <= nodeRect.bottom + 1,
              topGap:
                Math.round(
                  contentTop - nodeRect.top
                ),
              bottomGap:
                Math.round(
                  nodeRect.bottom - contentBottom
                ),
              alignContent:
                window
                  .getComputedStyle(
                    node
                  )
                  .alignContent,
              overflow:
                window
                  .getComputedStyle(
                    node
                  )
                  .overflow,
              controlOverflow:
                window
                  .getComputedStyle(
                    control
                  )
                  .overflow,
              dotZIndex:
                resizeDot
                  ? window
                    .getComputedStyle(
                      resizeDot
                    )
                    .zIndex
                  : null
            };
          }

          const effect =
            layout('effect');

          const effectNode =
            block.querySelector(
              '.card-property-field[data-property-id="effect"]'
            );

          effectNode.dataset.propertyRows =
            '5';

          effectNode.style.setProperty(
            '--property-field-rows',
            '5'
          );

          effectNode.style.setProperty(
            '--property-field-min-height',
            '220px'
          );

          effectNode.style.gridRow =
            '5 / span 5';

          const effectTall =
            layout('effect');

          return {
            gold:
              layout('gold'),
            silver:
              layout('silver'),
            copper:
              layout('copper'),
            weight:
              layout('weight'),
            armorProfile:
              layout('armorProfile'),
            effect:
              effect,
            effectTall
          };
        }
      );

    expect(
      result.gold
    ).toMatchObject({
      gridColumn: '1 / span 4',
      gridRow: '1 / span 2',
      span: '4',
      rows: '2'
    });

    expect(
      result.silver
    ).toMatchObject({
      gridColumn: '5 / span 4',
      gridRow: '1 / span 2',
      span: '4',
      rows: '2'
    });

    expect(
      result.copper
    ).toMatchObject({
      gridColumn: '9 / span 4',
      gridRow: '1 / span 2',
      span: '4',
      rows: '2'
    });

    expect(
      result.weight
    ).toMatchObject({
      gridColumn: '1 / span 4',
      gridRow: '3 / span 2',
      span: '4',
      rows: '2'
    });

    expect(
      result.armorProfile
    ).toMatchObject({
      gridColumn: '5 / span 8',
      gridRow: '3 / span 2',
      span: '8',
      rows: '2'
    });

    expect(
      result.effect
    ).toMatchObject({
      gridColumn: '1 / span 12',
      gridRow: '5 / span 2',
      span: '12',
      rows: '2'
    });

    [
      'gold',
      'silver',
      'copper',
      'weight'
    ].forEach(name => {

      expect(
        result[name].width
      ).toBeGreaterThan(
        120
      );

      expect(
        result[name].labelWidth
      ).toBeGreaterThan(
        16
      );

      expect(
        result[name].rows
      ).toBe(
        '2'
      );

      expect(
        result[name].alignContent
      ).toBe(
        'center'
      );

      expect(
        Math.abs(
          result[name].topGap - result[name].bottomGap
        )
      ).toBeLessThanOrEqual(
        12
      );
    });

    expect(
      result.gold.overflow
    ).toBe(
      'visible'
    );

    expect(
      result.effect.alignContent
    ).toBe(
      'stretch'
    );

    expect(
      result.effect.labelHeight
    ).toBeGreaterThan(
      8
    );

    expect(
      result.effect.labelTopGap
    ).toBeGreaterThanOrEqual(
      4
    );

    expect(
      result.effect.labelBeforeControl
    ).toBe(
      true
    );

    expect(
      result.effect.controlHeight
    ).toBeGreaterThan(
      36
    );

    expect(
      result.effect.controlBottomInside
    ).toBe(
      true
    );

    expect(
      result.effect.overflow
    ).toBe(
      'visible'
    );

    expect(
      result.effect.controlOverflow
    ).toBe(
      'auto'
    );

    expect(
      result.effectTall.rows
    ).toBe(
      '5'
    );

    expect(
      result.effectTall.labelBeforeControl
    ).toBe(
      true
    );

    expect(
      result.effectTall.labelHeight
    ).toBeGreaterThan(
      8
    );

    expect(
      result.effectTall.controlHeight
    ).toBeGreaterThan(
      result.effect.controlHeight
    );

    expect(
      result.effectTall.controlBottomInside
    ).toBe(
      true
    );

    expect(
      Number(
        result.gold.dotZIndex
      )
    ).toBeGreaterThanOrEqual(
      8
    );
  }
);


test(
  'item-armor-profile-is-one-removable-compound-property',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          editor
            .querySelector('[data-property-name="armorKind"]')
            .value =
            'Легкий';

          editor
            .querySelector('[data-property-name="armorBaseAc"]')
            .value =
            '12';

          editor
            .querySelector('[data-property-name="armorDexMax"]')
            .value =
            '2';

          editor
            .querySelector('.card-properties-settings-btn')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          let popup =
            document.querySelector('.property-settings-popup');

          const armorRowsBefore =
            [
              ...popup.querySelectorAll('.property-settings-row')
            ].filter(row =>
              row.textContent.includes('Доспех')
            ).length;

          popup
            .querySelector('.property-settings-delete[data-field-id="armorProfile"]')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const hasAfterDelete =
            Boolean(
              editor.querySelector('[data-property-name="armorKind"]')
            );

          popup =
            document.querySelector('.property-settings-popup');

          popup
            .querySelector('.property-settings-add')
            .click();

          const preset =
            popup.querySelector('.property-settings-preset');

          preset.value =
            'armorProfile';

          preset.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          popup
            .querySelector('.property-settings-create')
            .click();

          return {
            armorRowsBefore,
            hasAfterDelete:
              hasAfterDelete,
            restoredCompound:
              Boolean(
                editor.querySelector('[data-property-compound-name="armorProfile"]')
              ),
            restoredKeys:
              [
                'armorKind',
                'armorBaseAc',
                'armorDexMax'
              ].every(name =>
                Boolean(
                  editor.querySelector(`[data-property-name="${name}"]`)
                )
              )
          };
        }
      );

    expect(
      result
    ).toEqual({
      armorRowsBefore: 1,
      hasAfterDelete: false,
      restoredCompound: true,
      restoredKeys: true
    });
  }
);


test(
  'property-block-auto-calculates-skills-and-armor-class',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            readPropertiesModelFromElement
          } = await import('/js/properties/propertiesModel.js');

          const {
            createPropertiesCalculationModel
          } = await import('/js/properties/propertiesCalculationEngine.js');

          const {
            state
          } = await import('/js/state.js');

          state.pages = [
            {
              id: 'studded-leather',
              title: 'Проклепанная кожа',
              type: 'item',
              content: `
                <div class="template-block card-properties-block" data-block-type="properties" data-card-type="item">
                  <label class="card-property-field">
                    <span>Тип доспеха</span>
                    <select data-property-name="armorKind">
                      <option value="Легкий" selected>Легкий</option>
                    </select>
                  </label>
                  <label class="card-property-field">
                    <span>Базовая КЗ доспеха</span>
                    <input data-property-name="armorBaseAc" value="12">
                  </label>
                </div>
              `
            },
            {
              id: 'torch',
              title: 'Torch',
              type: 'item',
              content: `
                <div class="template-block card-properties-block" data-block-type="properties" data-card-type="item">
                  <label class="card-property-field">
                    <span>Тип доспеха</span>
                    <select data-property-name="armorKind">
                      <option value="Нет" selected>Нет</option>
                    </select>
                  </label>
                  <label class="card-property-field">
                    <span>Базовая КЗ доспеха</span>
                    <input data-property-name="armorBaseAc" value="99">
                  </label>
                </div>
              `
            }
          ];

          const host =
            document.createElement('div');

          document.body.appendChild(
            host
          );

          host.innerHTML =
            createPropertiesBlock({
              cardType: 'character'
            });

          applyBlockSystemContract(
            host
          );

          const level =
            host.querySelector('[data-property-name="level"]');

          const proficiencyBonus =
            host.querySelector('[data-property-name="proficiencyBonus"]');

          const initiative =
            host.querySelector('[data-property-name="initiative"]');

          const str =
            host.querySelector('[data-property-name="str"]');

          const athletics =
            host.querySelector('[data-property-name="skillAthletics"]');

          const athleticsProficient =
            host.querySelector('[data-property-name="skillAthleticsProficient"]');

          const dex =
            host.querySelector('[data-property-name="dex"]');

          const armorItem =
            host.querySelector('[data-property-name="armorItem"]');

          const armorClass =
            host.querySelector('[data-property-name="armorClass"]');

          const armorOptions =
            [...armorItem.options]
              .map(option => option.value);

          level.value =
            '5';

          level.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const proficiencyAtLevelFive =
            proficiencyBonus.value;

          str.value =
            '18';

          str.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const athleticsWithoutProficiency =
            athletics.value;

          athleticsProficient.value =
            '1';

          athleticsProficient.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const athleticsWithProficiency =
            athletics.value;

          athleticsProficient.value =
            '2';

          athleticsProficient.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const athleticsWithExpertise =
            athletics.value;

          athletics.value =
            '99';

          athletics.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const manualClass =
            athletics.closest('.card-property-skill-row')
              .classList
              .contains('is-manual-override');

          str.value =
            '10';

          str.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const manualStillProtected =
            athletics.value;

          athletics.value =
            '';

          athletics.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const automaticAfterClear =
            athletics.value;

          dex.value =
            '16';

          dex.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const dexModifierBadge =
            dex
              .closest('.card-property-field')
              .querySelector('.card-property-ability-modifier')
              ?.textContent || '';

          const initiativeFromDex =
            initiative.value;

          armorItem.value =
            'studded-leather';

          armorItem.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const armorClassFromArmor =
            armorClass.value;

          initiative.value =
            '8';

          initiative.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          dex.value =
            '10';

          dex.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          const manualInitiativeStillProtected =
            initiative.value;

          const model =
            readPropertiesModelFromElement(
              host.querySelector('.card-properties-block')
            );

          const calculations =
            createPropertiesCalculationModel({
              propertiesModel:
                model,
              pages:
                state.pages
            });

          return {
            proficiencyAtLevelFive,
            athleticsWithoutProficiency,
            athleticsWithProficiency,
            athleticsWithExpertise,
            manualClass,
            manualStillProtected,
            automaticAfterClear,
            dexModifierBadge,
            initiativeFromDex,
            manualInitiativeStillProtected,
            modelInitiativeSource:
              calculations.initiative.source,
            modelInitiative:
              calculations.initiative.value,
            armorOptions,
            armorClassFromArmor
          };
        }
      );

    expect(
      result.proficiencyAtLevelFive
    ).toBe(
      '3'
    );

    expect(
      result.athleticsWithoutProficiency
    ).toBe(
      '4'
    );

    expect(
      result.athleticsWithProficiency
    ).toBe(
      '7'
    );

    expect(
      result.athleticsWithExpertise
    ).toBe(
      '10'
    );

    expect(
      result.manualClass
    ).toBe(
      true
    );

    expect(
      result.manualStillProtected
    ).toBe(
      '99'
    );

    expect(
      result.automaticAfterClear
    ).toBe(
      '6'
    );

    expect(
      result.dexModifierBadge
    ).toBe(
      '+3'
    );

    expect(
      result.initiativeFromDex
    ).toBe(
      '3'
    );

    expect(
      result.manualInitiativeStillProtected
    ).toBe(
      '8'
    );

    expect(
      result.modelInitiativeSource
    ).toBe(
      'manual'
    );

    expect(
      result.modelInitiative
    ).toBe(
      8
    );

    expect(
      result.armorOptions
    ).toContain(
      'studded-leather'
    );

    expect(
      result.armorOptions
    ).not.toContain(
      'torch'
    );

    expect(
      result.armorClassFromArmor
    ).toBe(
      '15'
    );
  }
);


test(
  'property-settings-gear-opens-soft-settings-popup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            readPropertiesModelFromElement
          } = await import('/js/properties/propertiesModel.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          const button =
            editor.querySelector('.card-properties-settings-btn');

          button.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const popup =
            document.querySelector('.property-settings-popup');

          popup
            ?.querySelector('.property-settings-rules-toggle')
            ?.click();

          const popupVisibleBeforeOpen =
            Boolean(popup) &&
            !popup.classList.contains('hidden');

          const search =
            popup?.querySelector('.property-settings-rules-search');

          if (search) {

            search.value =
              'КЗ';

            search.dispatchEvent(
              new Event(
                'input',
                {
                  bubbles:
                    true
                }
              )
            );
          }

          const hiddenAfterSearch =
            popup?.querySelectorAll(
              '.property-settings-rule-node.hidden'
            ).length || 0;

          popup
            ?.querySelector('[data-rule-id="armor-class"]')
            ?.click();

          await new Promise(resolve =>
            setTimeout(
              resolve,
              50
            )
          );

          return {
            hasButton:
              Boolean(button),
            popupVisible:
              popupVisibleBeforeOpen,
            rowCount:
              popup?.querySelectorAll('.property-settings-row').length || 0,
            hasAddButton:
              Boolean(
                popup?.querySelector('.property-settings-add')
              ),
            rulesVisible:
              Boolean(
                popup?.querySelector('.property-settings-rules') &&
                !popup
                  .querySelector('.property-settings-rules')
                  .classList
                  .contains('hidden')
              ),
            rulesText:
              popup
                ?.querySelector('.property-settings-rules')
                ?.textContent || '',
            hasSearch:
              Boolean(search),
            hiddenAfterSearch,
            openedRule:
              editor
                ?.querySelector('.internal-rule-document')
                ?.dataset
                ?.internalRuleId || ''
          };
        }
      );

    expect(
      result
    ).toEqual({
      hasButton: true,
      popupVisible: true,
      rowCount: 6,
      hasAddButton: true,
      rulesVisible: true,
      rulesText:
        expect.stringContaining(
          'Класс доспеха'
        ),
      hasSearch: true,
      hiddenAfterSearch:
        expect.any(Number),
      openedRule:
        'armor-class'
    });

    expect(
      result.hiddenAfterSearch
    ).toBeGreaterThan(
      0
    );
  }
);


test(
  'character-model-reads-inventory-from-items-block',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const model =
            readCharacterModelFromPage({
              id: 'hero',
              type: 'character',
              content: `
                <div class="entity-layout card-shell">
                  <section class="entity-main">
                    <div class="template-block item-set-block" data-block-type="items">
                      <div class="item-set-list">
                        <button class="item-set-chip" data-page-id="rapier">
                          <span class="item-set-title">Рапира</span>
                          <label class="item-set-quantity-label">
                            <input class="item-set-quantity" value="1">
                          </label>
                        </button>
                        <button class="item-set-chip" data-page-id="arrows">
                          <span class="item-set-title">Стрелы</span>
                          <label class="item-set-quantity-label">
                            <input class="item-set-quantity" value="20">
                          </label>
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              `
            });

          return model.inventory;
        }
      );

    expect(
      result.totalQuantity
    ).toBe(
      21
    );

    expect(
      result.items.map(item => item.pageId)
    ).toEqual([
      'rapier',
      'arrows'
    ]);
  }
);


test(
  'character-model-reads-effects-data-from-persistent-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getCharacterEffects,
            hasCharacterCondition,
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const model =
            readCharacterModelFromPage({
              id: 'hero',
              type: 'character',
              content: `
                <div class="entity-layout card-shell">
                  <script type="application/json" data-character-effects>
                    {
                      "conditions": [
                        "restrained"
                      ],
                      "effects": [
                        {
                          "id": "haste",
                          "title": "Ускорение",
                          "sourceType": "spell",
                          "modifiers": {
                            "armorClass": 2,
                            "speed": 30
                          }
                        }
                      ]
                    }
                  </script>
                </div>
              `
            });

          const effects =
            getCharacterEffects(
              model
            );

          return {
            hasRestrained:
              hasCharacterCondition(
                model,
                'restrained'
              ),
            speed:
              effects.modifiers.speed,
            armorClass:
              effects.modifiers.armorClass,
            attackersHaveAdvantage:
              effects.flags.attackersHaveAdvantage
          };
        }
      );

    expect(
      result
    ).toEqual({
      hasRestrained: true,
      speed: 30,
      armorClass: 2,
      attackersHaveAdvantage: true
    });
  }
);


test(
  'character-effects-block-ui-updates-persistent-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createCharacterEffectsBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterEffectsBlocks,
            setupCharacterEffectsBlocks
          } = await import('/js/editor/characterEffectsBlock.js');

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterEffectsBlock({
              title: 'Эффекты'
            });

          let saves =
            0;

          setupCharacterEffectsBlocks(
            editor,
            () => {
              saves += 1;
            }
          );

          renderCharacterEffectsBlocks(
            editor
          );

          editor
            .querySelector('.character-effects-condition-select')
            .value =
              'poisoned';

          editor
            .querySelector('.character-effects-add-condition')
            .click();

          editor
            .querySelector('.character-effects-effect-title')
            .value =
              'Ускорение';

          editor
            .querySelector('.character-effects-initiative')
            .value =
              '2';

          editor
            .querySelector('.character-effects-add-effect')
            .click();

          const data =
            JSON.parse(
              editor.querySelector('[data-character-effects]').textContent
            );

          return {
            saves,
            condition:
              data.conditions[0].key,
            effectTitle:
              data.effects[0].title,
            initiative:
              data.effects[0].modifiers.initiative,
            visible:
              editor.querySelector('.character-effects-summary').textContent
          };
        }
      );

    expect(
      result.saves
    ).toBe(
      2
    );

    expect(
      result.condition
    ).toBe(
      'poisoned'
    );

    expect(
      result.effectTitle
    ).toBe(
      'Ускорение'
    );

    expect(
      result.initiative
    ).toBe(
      2
    );

    expect(
      result.visible
    ).toContain(
      'Отравлен'
  );
}
);


test(
  'property-settings-adds-custom-field-and-model-keeps-it-after-serialization',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract,
            serializePersistentEditorHTML
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            readPropertiesModelsFromHTML
          } = await import('/js/properties/propertiesModel.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          editor
            .querySelector('.card-properties-settings-btn')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const popup =
            document.querySelector('.property-settings-popup');

          popup
            .querySelector('.property-settings-add')
            .click();

          popup
            .querySelector('.property-settings-new-label')
            .value =
              'Радиус';

          popup
            .querySelector('.property-settings-new-type')
            .value =
              'number';

          popup
            .querySelector('.property-settings-create')
            .click();

          const customInput =
            editor.querySelector(
              '[data-property-custom-value="true"]'
            );

          customInput.value =
            '15';

          const html =
            serializePersistentEditorHTML(
              editor
            );

          const model =
            readPropertiesModelsFromHTML(
              html
            )[0];

          return {
            htmlHasRuntimeGear:
              html.includes('card-properties-settings-btn'),
            htmlHasCustomField:
              html.includes('data-property-custom="true"'),
            customLabel:
              model.customFields[0]?.label,
            customValue:
              model.customValues[model.customFields[0]?.key],
            customDragHandleCount:
              customInput
                .closest('.card-property-field')
                .querySelectorAll('.card-property-drag-handle')
                .length,
            customResizeDots:
              customInput
                .closest('.card-property-field')
                .querySelectorAll('.card-property-resize-dot')
                .length
          };
        }
      );

    expect(
      result
    ).toEqual({
      htmlHasRuntimeGear: false,
      htmlHasCustomField: true,
      customLabel: 'Радиус',
      customValue: '15',
      customDragHandleCount: 0,
      customResizeDots: 8
    });
  }
);


test(
  'property-settings-can-remove-standard-field-and-add-calculated-preset',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            readPropertiesModelFromElement
          } = await import('/js/properties/propertiesModel.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'character'
            });

          applyBlockSystemContract(
            editor
          );

          editor
            .querySelector('.card-properties-settings-btn')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          let popup =
            document.querySelector('.property-settings-popup');

          const deleteInitiative =
            popup.querySelector(
              '.property-settings-delete[data-field-id="initiative"]'
            );

          deleteInitiative.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          popup =
            document.querySelector('.property-settings-popup');

          popup
            .querySelector('.property-settings-add')
            .click();

          const preset =
            popup.querySelector('.property-settings-preset');

          preset.value =
            'initiative';

          preset.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          popup
            .querySelector('.property-settings-create')
            .click();

          return {
            hasInitiative:
              Boolean(
                editor.querySelector('[data-property-name="initiative"]')
              ),
            initiativeLabel:
              editor
                .querySelector(
                  '.card-property-field[data-property-id="initiative"] .card-property-label'
                )
                ?.textContent
                ?.trim(),
            initiativeType:
              editor
                .querySelector('[data-property-name="initiative"]')
                ?.getAttribute('type'),
            popupText:
              popup.textContent,
            hasSizeButton:
              Boolean(
                popup.querySelector(
                  '.property-settings-toggle-wide'
                )
              )
          };
        }
      );

    expect(
      result.hasInitiative
    ).toBe(
      true
    );

    expect(
      result.initiativeLabel
    ).toBe(
      'Инициатива'
    );

    expect(
      result.initiativeType
    ).toBe(
      'number'
    );

    expect(
      result.popupText
    ).not.toContain(
      'свой'
    );

    expect(
      result.hasSizeButton
    ).toBe(
      false
    );
  }
);


test(
  'property-fields-support-pointer-reorder-and-edge-resize',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            readPropertiesModelFromElement
          } = await import('/js/properties/propertiesModel.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          const firstField =
            editor.querySelector('[data-property-name="gold"]')
              .closest('.card-property-field');

          const secondField =
            editor.querySelector('[data-property-name="silver"]')
              .closest('.card-property-field');

          const secondRect =
            secondField.getBoundingClientRect();

          const firstRect =
            firstField.getBoundingClientRect();

          function readGridRowStart(
            node
          ) {

            return Number(
              String(
                node?.style?.gridRow || ''
              ).split('/')[0]
            ) || 0;
          }

          firstField.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: firstRect.left + 2,
                clientY: firstRect.top + 12,
                pointerId: 1
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: secondRect.left + 12,
                clientY: secondRect.top + 12,
                pointerId: 1
              }
            )
          );

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const hasGhostDuringDrag =
            Boolean(
              document.querySelector('.card-property-drag-ghost')
            );

          const hasPlaceholderDuringDrag =
            Boolean(
              editor.querySelector('.card-property-drop-placeholder')
            );

          const fieldHiddenDuringDrag =
            firstField.style.display === 'none';

          const placeholderDuringDrag =
            editor.querySelector('.card-property-drop-placeholder');

          const previewPlaceholderRow =
            readGridRowStart(
              placeholderDuringDrag
            );

          const previewSecondRow =
            readGridRowStart(
              secondField
            );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 1
              }
            )
          );

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const order =
            [
              ...editor.querySelectorAll('.card-property-field [data-property-name]')
            ].map(control => control.dataset.propertyName);

          const modelAfterOccupiedDrop =
            readPropertiesModelFromElement(
              editor.querySelector('.card-properties-block')
            );

          const resizeHandle =
            secondField.querySelector('.card-property-resize-dot-se');

          resizeHandle.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: 10,
                clientY: 10,
                pointerId: 2
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: 420,
                clientY: 160,
                pointerId: 2
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 2
              }
            )
          );

          const westHandle =
            firstField.querySelector('.card-property-resize-dot-w');

          westHandle.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: 120,
                clientY: 40,
                pointerId: 3
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: -260,
                clientY: 40,
                pointerId: 3
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 3
              }
            )
          );

          const orderAfterWestResize =
            [
              ...editor.querySelectorAll('.card-property-field [data-property-name]')
            ].map(control => control.dataset.propertyName);

          const grid =
            editor.querySelector('.card-properties-grid');

          grid.style.minHeight =
            '320px';

          const gridRect =
            grid.getBoundingClientRect();

          firstField.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: firstField.getBoundingClientRect().left + 2,
                clientY: firstField.getBoundingClientRect().top + 12,
                pointerId: 4
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: gridRect.right - 8,
                clientY: gridRect.bottom - 8,
                pointerId: 4
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 4
              }
            )
          );

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const orderAfterEmptyDrop =
            [
              ...editor.querySelectorAll('.card-property-field [data-property-name]')
            ].map(control => control.dataset.propertyName);

          const propertiesModel =
            readPropertiesModelFromElement(
              editor.querySelector('.card-properties-block')
            );

          return {
            order,
            layoutAfterOccupiedDrop:
              modelAfterOccupiedDrop.layout,
            hasGhostDuringDrag,
            hasPlaceholderDuringDrag,
            fieldHiddenDuringDrag,
            previewPlaceholderRow,
            previewSecondRow,
            hasGhostAfterDrop:
              Boolean(
                document.querySelector('.card-property-drag-ghost')
              ),
            hasPlaceholderAfterDrop:
              Boolean(
                editor.querySelector('.card-property-drop-placeholder')
              ),
            dragHandleCount:
              firstField.querySelectorAll('.card-property-drag-handle').length,
            span:
              secondField.dataset.propertySpan,
            rows:
              secondField.dataset.propertyRows,
            westSpan:
              firstField.dataset.propertySpan,
            orderAfterWestResize,
            orderAfterEmptyDrop,
            layoutAfterEmptyDrop:
              propertiesModel.layout,
            resizeDots:
              secondField.querySelectorAll('.card-property-resize-dot').length,
            supportsBorderDrag:
              firstField.matches('.card-property-field')
          };
        }
      );

    expect(
      result.order.slice(
        0,
        2
      )
    ).toEqual([
      'gold',
      'silver'
    ]);

    expect(
      result.layoutAfterOccupiedDrop.silver.y
    ).toBeGreaterThan(
      result.layoutAfterOccupiedDrop.gold.y
    );

    expect(
      result.hasGhostDuringDrag
    ).toBe(
      true
    );

    expect(
      result.hasPlaceholderDuringDrag
    ).toBe(
      true
    );

    expect(
      result.fieldHiddenDuringDrag
    ).toBe(
      true
    );

    expect(
      result.previewSecondRow
    ).toBeGreaterThan(
      result.previewPlaceholderRow
    );

    expect(
      result.hasGhostAfterDrop
    ).toBe(
      false
    );

    expect(
      result.hasPlaceholderAfterDrop
    ).toBe(
      false
    );

    expect(
      result.dragHandleCount
    ).toBe(
      0
    );

    expect(
      Number(result.span)
    ).toBeGreaterThan(
      3
    );

    expect(
      Number(result.rows)
    ).toBeGreaterThan(
      1
    );

    expect(
      Number(result.westSpan)
    ).toBeGreaterThan(
      3
    );

    expect(
      result.orderAfterWestResize[0]
    ).toBe(
      'gold'
    );

    expect(
      result.orderAfterEmptyDrop[0]
    ).toBe(
      'gold'
    );

    expect(
      result.layoutAfterEmptyDrop.gold.order
    ).toBe(
      0
    );

    expect(
      result.layoutAfterEmptyDrop.gold.y
    ).toBeGreaterThan(
      0
    );

    expect(
      result.layoutAfterEmptyDrop.gold
    ).toEqual(
      expect.objectContaining({
        w:
          Number(result.westSpan),
        h:
          2,
        collapsed:
          false
      })
    );

    expect(
      result.resizeDots
    ).toBe(
      8
    );

    expect(
      result.supportsBorderDrag
    ).toBe(
      true
    );
  }
);


test(
  'property-field-drag-drops-to-cursor-grid-cell',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            readPropertiesModelFromElement
          } = await import('/js/properties/propertiesModel.js');

          const editor =
            document.querySelector('#editorArea');

          editor.style.width =
            '720px';

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          const field =
            editor.querySelector('[data-property-name="gold"]')
              .closest('.card-property-field');

          const grid =
            editor.querySelector('.card-properties-grid');

          grid.style.minHeight =
            '520px';

          const fieldRect =
            field.getBoundingClientRect();

          field.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: fieldRect.right - 2,
                clientY: fieldRect.top + 10,
                pointerId: 41
              }
            )
          );

          const gridRect =
            grid.getBoundingClientRect();

          function getGridColumnStep(
            grid,
            gridRect
          ) {

            const style =
              window.getComputedStyle(
                grid
              );

            const gap =
              Number.parseFloat(
                style.columnGap
              ) || 0;

            return (
              (
                gridRect.width -
                gap * 11
              ) / 12
            ) + gap;
          }


          function getGridRowStep(
            grid
          ) {

            const style =
              window.getComputedStyle(
                grid
              );

            const gap =
              Number.parseFloat(
                style.rowGap
              ) || 0;

            return 42 + gap;
          }

          const cellWidth =
            getGridColumnStep(
              grid,
              gridRect
            );

          const rowHeight =
            getGridRowStep(
              grid
            );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: gridRect.left + cellWidth * 7 + 2,
                clientY: gridRect.top + rowHeight * 5 + 2,
                pointerId: 41
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 41
              }
            )
          );

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const model =
            readPropertiesModelFromElement(
              editor.querySelector('.card-properties-block')
            );

          return model.layout.gold;
        }
      );

    expect(
      result.x
    ).toBe(
      7
    );

    expect(
      result.y
    ).toBe(
      5
    );
  }
);


test(
  'character-effects-block-can-link-effect-from-source-card',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            createCharacterEffectsBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterEffectsBlocks,
            setupCharacterEffectsBlocks
          } = await import('/js/editor/characterEffectsBlock.js');

          state.currentPage = {
            id: 'hero',
            type: 'character'
          };

          state.pages = [
            state.currentPage,
            {
              id: 'boots',
              title: 'Сапоги скорости',
              name: 'Сапоги скорости',
              type: 'item',
              content: `
                <script type="application/json" data-character-effects>
                  {
                    "effects": [
                      {
                        "id": "speed",
                        "title": "Быстрый шаг",
                        "sourceType": "item",
                        "modifiers": {
                          "speed": 10,
                          "initiative": 1
                        }
                      }
                    ]
                  }
                </script>
              `
            }
          ];

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterEffectsBlock({
              title: 'Эффекты'
            });

          setupCharacterEffectsBlocks(
            editor,
            () => {}
          );

          renderCharacterEffectsBlocks(
            editor
          );

          editor.querySelector(
            '.character-effects-source-page'
          ).value =
            'boots';

          editor.querySelector(
            '.character-effects-add-effect'
          ).click();

          const data =
            JSON.parse(
              editor.querySelector('[data-character-effects]').textContent
            );

          return {
            title:
              data.effects[0].title,
            sourcePageId:
              data.effects[0].sourcePageId,
            speed:
              data.effects[0].modifiers.speed
          };
        }
      );

    expect(
      result
    ).toEqual({
      title: 'Сапоги скорости: Быстрый шаг',
      sourcePageId: 'boots',
      speed: 10
    });
  }
);


test(
  'character-effects-block-selects-rule-tree-rule-for-character-model',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            getCharacterEffectiveArmorClass,
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const {
            createCharacterEffectsBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterEffectsBlocks,
            setupCharacterEffectsBlocks
          } = await import('/js/editor/characterEffectsBlock.js');

          state.currentPage = {
            id: 'hero',
            title: 'Герой',
            type: 'character'
          };

          state.pages = [
            state.currentPage,
            {
              id: 'rule-tree',
              title: 'Правила',
              template: 'ruleTree',
              type: 'ruleTree',
              tags: [
                'rule-tree'
              ],
              content: `
                <div class="rule-tree-document">
                  <script type="application/json" data-rule-tree-data>
                    {
                      "version": 1,
                      "activeRuleIds": [],
                      "rules": [
                        {
                          "id": "rule-defense",
                          "title": "Боевой стиль: оборона",
                          "effects": [
                            {
                              "id": "defense",
                              "title": "Оборона",
                              "modifiers": {
                                "armorClass": 1
                              }
                            }
                          ]
                        }
                      ]
                    }
                  </script>
                </div>
              `
            }
          ];

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterEffectsBlock({
              title: 'Эффекты'
            });

          setupCharacterEffectsBlocks(
            editor,
            () => {}
          );

          renderCharacterEffectsBlocks(
            editor
          );

          editor.querySelector(
            '.character-effects-rule-select'
          ).value =
            'rule-defense';

          editor.querySelector(
            '.character-effects-add-rule'
          ).click();

          const data =
            JSON.parse(
              editor.querySelector('[data-character-effects]').textContent
            );

          const pageModel =
            {
              ...state.currentPage,
              content:
                editor.innerHTML
            };

          const character =
            readCharacterModelFromPage(
              pageModel,
              {
                pages:
                  state.pages
              }
            );

          return {
            selectedRuleIds:
              data.selectedRuleIds,
            armorClass:
              getCharacterEffectiveArmorClass(
                character
              )
          };
        }
      );

    expect(
      result.selectedRuleIds
    ).toEqual([
      'rule-defense'
    ]);

    expect(
      result.armorClass
    ).toBe(
      11
  );
}
);


test(
  'property-settings-gear-appears-when-contract-applies-to-new-block-root',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const wrapper =
            document.createElement('div');

          wrapper.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          const block =
            wrapper.firstElementChild;

          applyBlockSystemContract(
            block
          );

          const button =
            block.querySelector(
              '.card-properties-settings-btn'
            );

          button?.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const popup =
            document.querySelector('.property-settings-popup');

          return {
            hasButton:
              Boolean(button),
            popupVisible:
              Boolean(popup) &&
              !popup.classList.contains('hidden')
          };
        }
      );

    expect(
      result
    ).toEqual({
      hasButton: true,
      popupVisible: true
    });
  }
);


test(
  'character-model-auto-applies-effects-from-inventory-items',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getCharacterEffectiveSpeed,
            getCharacterInitiativeModifier,
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const itemPage = {
            id: 'boots',
            title: 'Сапоги скорости',
            type: 'item',
            content: `
              <script type="application/json" data-character-effects>
                {
                  "effects": [
                    {
                      "id": "speed",
                      "title": "Быстрый шаг",
                      "sourceType": "item",
                      "modifiers": {
                        "speed": 10,
                        "initiative": 2
                      }
                    }
                  ]
                }
              </script>
            `
          };

          const heroPage = {
            id: 'hero',
            type: 'character',
            content: `
              <div class="entity-layout card-shell">
                <div class="template-block item-set-block" data-block-type="items">
                  <div class="item-set-list">
                    <button class="item-set-chip" data-page-id="boots">
                      <span class="item-set-title">Сапоги скорости</span>
                      <input class="item-set-quantity" value="1">
                    </button>
                  </div>
                </div>
              </div>
            `
          };

          const model =
            readCharacterModelFromPage(
              heroPage,
              {
                pages: [
                  heroPage,
                  itemPage
                ]
              }
            );

          return {
            speed:
              getCharacterEffectiveSpeed(
                model
              ),
            initiative:
              getCharacterInitiativeModifier(
                model
              ),
            effectTitle:
              model.effects.effects[0].title
          };
        }
      );

    expect(
      result
    ).toEqual({
      speed: 40,
      initiative: 2,
      effectTitle: 'Сапоги скорости: Быстрый шаг'
    });
  }
);


test(
  'character-sheet-block-renders-character-model-summary',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            createCharacterSheetBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterSheetBlocks
          } = await import('/js/editor/characterSheetBlock.js');

          state.currentPage = {
            id: 'hero',
            type: 'character',
            content: `
              <div class="entity-layout card-shell">
                <div class="template-block card-properties-block" data-block-type="properties" data-card-type="character">
                  <input data-property-name="level" value="5">
                  <input data-property-name="armorClass" value="15">
                  <input data-property-name="speed" value="30">
                  <input data-property-name="hpCurrent" value="12">
                  <input data-property-name="hpMax" value="20">
                  <input data-property-name="dex" value="16">
                </div>
                <script type="application/json" data-character-effects>
                  {
                    "effects": [
                      {
                        "id": "shield",
                        "title": "Щит",
                        "modifiers": {
                          "armorClass": 2
                        }
                      }
                    ]
                  }
                </script>
              </div>
            `
          };

          state.pages = [
            state.currentPage
          ];

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterSheetBlock();

          renderCharacterSheetBlocks(
            editor
          );

          return editor.textContent;
        }
      );

    expect(
      result
    ).toContain(
      'Класс защиты'
    );

    expect(
      result
    ).toContain(
      '17'
    );

    expect(
      result
    ).toContain(
      'Щит'
    );
  }
);


test(
  'character-sheet-edit-writes-values-to-properties-block',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            createCharacterSheetBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterSheetBlocks,
            setupCharacterSheetBlocks
          } = await import('/js/editor/characterSheetBlock.js');

          state.currentPage = {
            id: 'hero',
            type: 'character',
            content: ''
          };

          state.pages = [
            state.currentPage
          ];

          const editor =
            document.createElement('div');

          editor.id =
            'editorArea';

          editor.innerHTML = `
            <section class="entity-main">
              <div class="blocks-toolbar" data-runtime="true"></div>
              ${createCharacterSheetBlock()}
            </section>
          `;

          let saved =
            false;

          setupCharacterSheetBlocks(
            editor,
            async () => {

              saved =
                true;
            }
          );

          renderCharacterSheetBlocks(
            editor
          );

          const levelInput =
            editor.querySelector(
              '[data-character-sheet-field="level"]'
            );

          levelInput.value =
            '7';

          levelInput.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await new Promise(resolve =>
            setTimeout(resolve)
          );

          const propertiesBlock =
            editor.querySelector(
              '.card-properties-block[data-card-type="character"]'
            );

          return {
            saved,
            hasPropertiesBlock:
              Boolean(propertiesBlock),
            level:
              propertiesBlock
                ?.querySelector('[data-property-name="level"]')
                ?.getAttribute('value')
          };
        }
      );

    expect(
      result
    ).toEqual({
      saved: true,
      hasPropertiesBlock: true,
      level: '7'
    });
  }
);


test(
  'character-sheet-edits-death-saves-and-clears-manual-override',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            createCharacterSheetBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterSheetBlocks,
            setupCharacterSheetBlocks
          } = await import('/js/editor/characterSheetBlock.js');

          state.currentPage = {
            id: 'hero',
            type: 'character',
            content: ''
          };

          state.pages = [
            state.currentPage
          ];

          const editor =
            document.createElement('div');

          editor.id =
            'editorArea';

          editor.innerHTML = `
            <section class="entity-main">
              <div class="blocks-toolbar" data-runtime="true"></div>
              ${createCharacterSheetBlock()}
            </section>
          `;

          let saves =
            0;

          setupCharacterSheetBlocks(
            editor,
            async () => {

              saves += 1;
            }
          );

          renderCharacterSheetBlocks(
            editor
          );

          const failureInputs =
            [
              ...editor.querySelectorAll(
                '[data-character-sheet-death-field="deathSaveFailures"]'
              )
            ];

          failureInputs[0].checked =
            true;

          failureInputs[0].dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await new Promise(resolve =>
            setTimeout(resolve)
          );

          const speedInput =
            editor.querySelector(
              '[data-character-sheet-override="speed"]'
            );

          speedInput.value =
            '45';

          speedInput.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await new Promise(resolve =>
            setTimeout(resolve)
          );

          const clearButton =
            editor.querySelector(
              '[data-character-sheet-clear-override="speed"]'
            );

          clearButton.click();

          await new Promise(resolve =>
            setTimeout(resolve)
          );

          const propertiesBlock =
            editor.querySelector(
              '.card-properties-block[data-card-type="character"]'
            );

          return {
            saves,
            deathFailures:
              propertiesBlock
                ?.querySelector('[data-property-name="deathSaveFailures"]')
                ?.getAttribute('value'),
            speedOverride:
              propertiesBlock
                ?.querySelector('[data-property-name="override-speed"]')
                ?.getAttribute('value') || ''
          };
        }
      );

    expect(
      result.deathFailures
    ).toBe(
      '1'
    );

    expect(
      result.speedOverride
    ).toBe(
      ''
    );

    expect(
      result.saves
    ).toBeGreaterThanOrEqual(
      3
    );
  }
);


test(
  'universal-list-block-switches-kind-without-changing-block-type',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createListBlock
          } = await import('/js/templates/blockTypes.js');

          const wrapper =
            document.createElement('div');

          wrapper.innerHTML =
            createListBlock({
              title: 'Связи',
              kind: 'items'
            });

          const block =
            wrapper.firstElementChild;

          document.body.appendChild(
            block
          );

          const select =
            block.querySelector(
              '.universal-list-kind-select'
            );

          select.value =
            'creatures';

          select.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await new Promise(resolve =>
            setTimeout(resolve)
          );

          return {
            blockType:
              block.dataset.blockType,
            listKind:
              block.dataset.listKind,
            selected:
              block.querySelector('option[value="creatures"]')
                ?.hasAttribute('selected')
          };
        }
      );

    expect(
      result
    ).toEqual({
      blockType: 'list',
      listKind: 'creatures',
      selected: true
    });
  }
);
