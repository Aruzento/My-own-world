import {
  expect,
  test
} from '@playwright/test';


test(
  'character health preparation is detached, atomic, inverse-ready and side-effect free',
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
            readCharacterModelFromPage,
            getCharacterHealth
          } = await import('/js/character/characterModel.js');

          const {
            prepareCharacterHealthMutation
          } = await import('/js/properties/characterHealthMutation.js');

          const makePage = (
            hpCurrent,
            hpMax,
            hpTemp,
            id = 'target'
          ) => {

            const wrapper =
              document.createElement('div');

            wrapper.innerHTML =
              createPropertiesBlock({
                cardType: 'character',
                title: 'Target properties'
              });

            const setValue = (
              field,
              value
            ) => {

              const control =
                wrapper.querySelector(
                  `[data-property-name="${field}"]`
                );

              control.value =
                String(value);

              control.setAttribute(
                'value',
                String(value)
              );
            };

            setValue(
              'hpCurrent',
              hpCurrent
            );

            setValue(
              'hpMax',
              hpMax
            );

            setValue(
              'hpTemp',
              hpTemp
            );

            setValue(
              'armorClass',
              17
            );

            const content =
              `---\nid: ${id}\ntype: character\ncustom: preserved\n---\n\n` +
              `${wrapper.innerHTML}\n` +
              '<section data-unrelated="preserved"><p>Keep me exactly</p></section>\n';

            return {
              id,
              path:
                `pages/${id}.md`,
              title:
                'Target',
              type:
                'character',
              tags: [
                'enemy'
              ],
              content
            };
          };

          const effects = {
            reads: 0,
            writes: 0,
            appends: 0
          };

          let durableContent =
            '';

          const storageAdapter = {
            readText: async () => {

              effects.reads +=
                1;

              return durableContent;
            },
            writeText: async () => {

              effects.writes +=
                1;

              throw new Error('Preparation must not write.');
            },
            appendText: async () => {

              effects.appends +=
                1;

              throw new Error('Preparation must not append.');
            }
          };

          const original =
            makePage(
              10,
              10,
              2
            );

          const originalJson =
            JSON.stringify(original);

          durableContent =
            original.content;

          const bodyBefore =
            document.body.innerHTML;

          const damagePlan =
            await prepareCharacterHealthMutation(
              original,
              {
                type: 'delta',
                delta: -5
              },
              {
                storageAdapter
              }
            );

          const readback =
            getCharacterHealth(
              readCharacterModelFromPage({
                ...original,
                content:
                  damagePlan.nextContent
              })
            );

          const nextWrapper =
            document.createElement('div');

          nextWrapper.innerHTML =
            damagePlan.nextContent;

          const nextArmorClass =
            nextWrapper.querySelector(
              '[data-property-name="armorClass"]'
            )?.getAttribute('value');

          const unrelatedText =
            nextWrapper.querySelector(
              '[data-unrelated="preserved"]'
            )?.textContent;

          const damagedPage = {
            ...original,
            content:
              damagePlan.nextContent
          };

          durableContent =
            damagedPage.content;

          const inversePlan =
            await prepareCharacterHealthMutation(
              damagedPage,
              {
                type: 'exact',
                hpCurrent: 10,
                hpTemp: 2
              },
              {
                storageAdapter
              }
            );

          durableContent =
            original.content;

          const noOpPlan =
            await prepareCharacterHealthMutation(
              original,
              {
                type: 'exact',
                hpCurrent: 10,
                hpTemp: 2
              },
              {
                storageAdapter
              }
            );

          const frozen = {
            plan:
              Object.isFrozen(damagePlan),
            before:
              Object.isFrozen(damagePlan.before),
            changedFields:
              Object.isFrozen(damagePlan.changedFields),
            expectedBase:
              Object.isFrozen(damagePlan.expectedBase)
          };

          try {

            damagePlan.before.hpCurrent =
              999;

            damagePlan.changedFields.push({
              field: 'hpMax',
              before: 10,
              after: 999
            });

          } catch {

            // ES modules reject writes to the frozen plan; values are checked below.
          }

          return {
            damage: {
              kind:
                damagePlan.kind,
              version:
                damagePlan.version,
              pageId:
                damagePlan.pageId,
              source:
                damagePlan.source,
              before:
                damagePlan.before,
              after:
                damagePlan.after,
              changed:
                damagePlan.changed,
              changedFields:
                damagePlan.changedFields,
              guards:
                damagePlan.guards,
              expectedStatus:
                damagePlan.expectedBase ? 'captured' : 'missing'
            },
            inverse: {
              before:
                inversePlan.before,
              after:
                inversePlan.after,
              changedFields:
                inversePlan.changedFields
            },
            noOp: {
              changed:
                noOpPlan.changed,
              changedFields:
                noOpPlan.changedFields,
              retainedContent:
                noOpPlan.nextContent === original.content
            },
            readback,
            preservation: {
              originalUnchanged:
                JSON.stringify(original) === originalJson,
              frontMatter:
                damagePlan.nextContent.startsWith(
                  '---\nid: target\ntype: character\ncustom: preserved\n---'
                ),
              armorClass:
                nextArmorClass,
              unrelatedText,
              bodyUnchanged:
                document.body.innerHTML === bodyBefore
            },
            frozen,
            effects
          };
        }
      );

    expect(
      result.damage
    ).toEqual({
      kind: 'CharacterHealthMutationPlan',
      version: 1,
      pageId: 'target',
      source: {
        kind: 'properties',
        cardType: 'character'
      },
      before: {
        hpCurrent: 10,
        hpMax: 10,
        hpTemp: 2
      },
      after: {
        hpCurrent: 7,
        hpMax: 10,
        hpTemp: 0
      },
      changed: true,
      changedFields: [
        {
          field: 'hpTemp',
          before: 2,
          after: 0
        },
        {
          field: 'hpCurrent',
          before: 10,
          after: 7
        }
      ],
      guards: {
        hpMax: 10,
        unchangedFields: [
          {
            field: 'hpMax',
            value: 10
          }
        ]
      },
      expectedStatus: 'captured'
    });

    expect(
      result.inverse
    ).toEqual({
      before: {
        hpCurrent: 7,
        hpMax: 10,
        hpTemp: 0
      },
      after: {
        hpCurrent: 10,
        hpMax: 10,
        hpTemp: 2
      },
      changedFields: [
        {
          field: 'hpTemp',
          before: 0,
          after: 2
        },
        {
          field: 'hpCurrent',
          before: 7,
          after: 10
        }
      ]
    });

    expect(
      result.noOp
    ).toEqual({
      changed: false,
      changedFields: [],
      retainedContent: true
    });

    expect(
      result.readback
    ).toEqual({
      current: 7,
      max: 10,
      temp: 0,
      percent: 0.7,
      isDown: false,
      source: 'properties'
    });

    expect(
      result.preservation
    ).toEqual({
      originalUnchanged: true,
      frontMatter: true,
      armorClass: '17',
      unrelatedText: 'Keep me exactly',
      bodyUnchanged: true
    });

    expect(
      result.frozen
    ).toEqual({
      plan: true,
      before: true,
      changedFields: true,
      expectedBase: true
    });

    expect(
      result.effects
    ).toEqual({
      reads: 3,
      writes: 0,
      appends: 0
    });
  }
);


test(
  'character health preparation rejects invalid, ambiguous, legacy and stale sources',
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
            prepareCharacterHealthMutation
          } = await import('/js/properties/characterHealthMutation.js');

          const makeContent = () => {

            const wrapper =
              document.createElement('div');

            wrapper.innerHTML =
              createPropertiesBlock({
                cardType: 'character'
              });

            for (const [
              field,
              value
            ] of Object.entries({
              hpCurrent: '10',
              hpMax: '10',
              hpTemp: '2'
            })) {

              const control =
                wrapper.querySelector(
                  `[data-property-name="${field}"]`
                );

              control.value =
                value;

              control.setAttribute(
                'value',
                value
              );
            }

            return wrapper.innerHTML;
          };

          const cases = [
            [
              'missing-current',
              wrapper => wrapper.querySelector('[data-property-name="hpCurrent"]').remove()
            ],
            [
              'missing-max',
              wrapper => wrapper.querySelector('[data-property-name="hpMax"]').remove()
            ],
            [
              'missing-temp',
              wrapper => wrapper.querySelector('[data-property-name="hpTemp"]').remove()
            ],
            [
              'not-numeric',
              wrapper => wrapper.querySelector('[data-property-name="hpCurrent"]').setAttribute('value', 'bad')
            ],
            [
              'fractional',
              wrapper => wrapper.querySelector('[data-property-name="hpTemp"]').setAttribute('value', '0.5')
            ],
            [
              'negative-current',
              wrapper => wrapper.querySelector('[data-property-name="hpCurrent"]').setAttribute('value', '-1')
            ],
            [
              'negative-temp',
              wrapper => wrapper.querySelector('[data-property-name="hpTemp"]').setAttribute('value', '-1')
            ],
            [
              'non-positive-max',
              wrapper => wrapper.querySelector('[data-property-name="hpMax"]').setAttribute('value', '0')
            ],
            [
              'current-over-max',
              wrapper => wrapper.querySelector('[data-property-name="hpCurrent"]').setAttribute('value', '11')
            ],
            [
              'duplicate-field',
              wrapper => wrapper.querySelector('[data-property-name="hpTemp"]').after(
                wrapper.querySelector('[data-property-name="hpTemp"]').cloneNode(true)
              )
            ],
            [
              'duplicate-block',
              wrapper => wrapper.append(
                wrapper.firstElementChild.cloneNode(true)
              )
            ]
          ];

          const failures =
            {};

          for (const [
            name,
            mutate
          ] of cases) {

            const wrapper =
              document.createElement('div');

            wrapper.innerHTML =
              makeContent();

            mutate(
              wrapper
            );

            const content =
              wrapper.innerHTML;

            try {

              await prepareCharacterHealthMutation(
                {
                  id: name,
                  path: `pages/${name}.md`,
                  type: 'character',
                  content
                },
                {
                  type: 'exact',
                  hpCurrent: 5,
                  hpTemp: 0
                },
                {
                  storageAdapter: {
                    readText: async () => content
                  }
                }
              );

              failures[name] =
                'accepted';

            } catch (error) {

              failures[name] =
                error.code;
            }
          }

          for (const [
            name,
            content
          ] of [
            [
              'empty-source',
              '<p>No health source</p>'
            ],
            [
              'legacy-only',
              '<div class="dnd-stats-block"><input data-field="hp" value="10"></div>'
            ]
          ]) {

            try {

              await prepareCharacterHealthMutation(
                {
                  id: name,
                  type: 'character',
                  content
                },
                {
                  type: 'exact',
                  hpCurrent: 5,
                  hpTemp: 0
                }
              );

              failures[name] =
                'accepted';

            } catch (error) {

              failures[name] =
                error.code;
            }
          }

          const staleContent =
            makeContent();

          let staleWrites =
            0;

          try {

            await prepareCharacterHealthMutation(
              {
                id: 'stale',
                path: 'pages/stale.md',
                type: 'character',
                content:
                  staleContent
              },
              {
                type: 'delta',
                delta: -1
              },
              {
                storageAdapter: {
                  readText: async () => `${staleContent}<p>newer</p>`,
                  writeText: async () => {

                    staleWrites +=
                      1;
                  }
                }
              }
            );

            failures.stale =
              'accepted';

          } catch (error) {

            failures.stale =
              error.code;
          }

          return {
            failures,
            staleWrites
          };
        }
      );

    expect(
      result
    ).toEqual({
      failures: {
        'missing-current': 'CHARACTER_HEALTH_FIELD_MISSING',
        'missing-max': 'CHARACTER_HEALTH_FIELD_MISSING',
        'missing-temp': 'CHARACTER_HEALTH_FIELD_MISSING',
        'not-numeric': 'CHARACTER_HEALTH_FIELD_INVALID',
        fractional: 'CHARACTER_HEALTH_FIELD_INVALID',
        'negative-current': 'CHARACTER_HEALTH_FIELD_INVALID',
        'negative-temp': 'CHARACTER_HEALTH_FIELD_INVALID',
        'non-positive-max': 'CHARACTER_HEALTH_FIELD_INVALID',
        'current-over-max': 'CHARACTER_HEALTH_STATE_INVALID',
        'duplicate-field': 'CHARACTER_HEALTH_FIELD_DUPLICATE',
        'duplicate-block': 'CHARACTER_HEALTH_SOURCE_AMBIGUOUS',
        'empty-source': 'CHARACTER_HEALTH_SOURCE_MISSING',
        'legacy-only': 'CHARACTER_HEALTH_SOURCE_UNSUPPORTED',
        stale: 'CHARACTER_HEALTH_PRECONDITION_FAILED'
      },
      staleWrites: 0
    });
  }
);
