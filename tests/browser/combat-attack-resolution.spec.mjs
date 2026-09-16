import {
  expect,
  test
} from '@playwright/test';


test(
  'single-target attack resolves hit equality miss temp HP and no-op without side effects',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await page.evaluate(
        async () => {

          const {
            CampaignMapModel
          } = await import('/js/editor/campaignMapModel.js');

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            resolveSingleTargetAttack
          } = await import('/js/combat/combatAttackResolution.js');

          const makePage = (
            id,
            {
              hpCurrent = 10,
              hpMax = 10,
              hpTemp = 0,
              armorClass = 12
            } = {}
          ) => {

            const wrapper =
              document.createElement('div');

            wrapper.innerHTML =
              createPropertiesBlock({
                cardType: 'character',
                title: `${id} properties`
              });

            for (const [field, value] of Object.entries({
              hpCurrent,
              hpMax,
              hpTemp,
              armorClass
            })) {

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
            }

            return {
              id,
              path: `pages/${id}.md`,
              title: id,
              type: 'character',
              content:
                `---\nid: ${id}\ntype: character\ncustom: preserved\n---\n\n` +
                `${wrapper.innerHTML}\n` +
                '<p data-unrelated="preserved">Unrelated</p>\n'
            };
          };

          const makeRequest = () => ({
            kind: 'CombatActionRequest',
            version: 1,
            actionId: 'action-1',
            mapPageId: 'map-1',
            sessionId: 'session-1',
            actor: {
              participantId: 'token:actor'
            },
            target: {
              participantId: 'token:target'
            },
            action: {
              type: 'attack',
              definitionId: 'gm-shortbow',
              label: 'Shortbow',
              source: {
                kind: 'manual'
              },
              hitPolicy: 'ac-total-v1',
              attackRoll: {
                formula: 'd20 + 4',
                mode: 'normal',
                criticalPolicy: 'none'
              },
              damageComponents: [
                {
                  componentId: 'piercing-1',
                  damageType: 'piercing',
                  roll: {
                    formula: '1d6 + 2',
                    mode: 'normal',
                    criticalPolicy: 'none'
                  }
                }
              ]
            }
          });

          const makeWorld = (
            targetHealth = {}
          ) => {

            const pages = [
              makePage('actor-page'),
              makePage('target-page', targetHealth)
            ];

            const mapModel =
              new CampaignMapModel({
                tokens: [
                  {
                    tokenId: 'actor',
                    pageId: 'actor-page',
                    name: 'Actor',
                    sourceMode: 'original'
                  },
                  {
                    tokenId: 'target',
                    pageId: 'target-page',
                    name: 'Target',
                    sourceMode: 'original'
                  }
                ],
                initiative: {
                  participants: [
                    {
                      participantId: 'token:actor',
                      tokenId: 'actor',
                      pageId: 'actor-page',
                      sourceMode: 'original',
                      name: 'Actor'
                    },
                    {
                      participantId: 'token:target',
                      tokenId: 'target',
                      pageId: 'target-page',
                      sourceMode: 'original',
                      name: 'Target'
                    }
                  ],
                  activeParticipantId: 'token:actor'
                },
                combatSession: {
                  sessionId: 'session-1',
                  status: 'active',
                  round: 3,
                  participants: [
                    {
                      participantId: 'token:actor'
                    },
                    {
                      participantId: 'token:target'
                    },
                    {
                      participantId: 'token:broken-unrelated'
                    }
                  ]
                }
              });

            const effects = {
              reads: 0,
              writes: 0,
              appends: 0
            };

            const storageAdapter = {
              readText: async path => {

                effects.reads += 1;

                return pages.find(candidate =>
                  candidate.path === path
                )?.content || '';
              },
              writeText: async () => {

                effects.writes += 1;
                throw new Error('Resolution must not write.');
              },
              appendText: async () => {

                effects.appends += 1;
                throw new Error('Resolution must not append.');
              }
            };

            return {
              pages,
              mapModel,
              effects,
              storageAdapter,
              resolvePage: id =>
                pages.find(candidate => candidate.id === id) || null
            };
          };

          const execute =
            async ({
              targetHealth,
              rolls,
              mutateRequest
            }) => {

              const world =
                makeWorld(targetHealth);

              const request =
                makeRequest();

              mutateRequest?.(request);

              const targetBefore =
                JSON.stringify(world.pages[1]);

              const mapBefore =
                JSON.stringify(world.mapModel.toJSON());

              const bodyBefore =
                document.body.innerHTML;

              const rngCalls = [];
              let rollIndex = 0;

              const resolution =
                await resolveSingleTargetAttack(
                  request,
                  {
                    mapPageId: 'map-1',
                    mapModel: world.mapModel,
                    pages: world.pages,
                    resolvePage: world.resolvePage,
                    storageAdapter: world.storageAdapter,
                    randomInt: (min, max) => {

                      rngCalls.push([min, max]);

                      const value =
                        rolls[rollIndex];

                      rollIndex += 1;

                      return value;
                    }
                  }
                );

              return {
                resolution,
                rngCalls,
                effects: world.effects,
                targetUnchanged:
                  JSON.stringify(world.pages[1]) === targetBefore,
                mapUnchanged:
                  JSON.stringify(world.mapModel.toJSON()) === mapBefore,
                bodyUnchanged:
                  document.body.innerHTML === bodyBefore,
                frozen: {
                  resolution: Object.isFrozen(resolution),
                  actor: Object.isFrozen(resolution.actor),
                  roll: Object.isFrozen(resolution.attackRoll),
                  health: resolution.health
                    ? Object.isFrozen(resolution.health.mutationPlan)
                    : true
                }
              };
            };

          const hit =
            await execute({
              rolls: [10, 3]
            });

          const equality =
            await execute({
              rolls: [8, 1]
            });

          const miss =
            await execute({
              rolls: [3]
            });

          const tempHp =
            await execute({
              targetHealth: {
                hpCurrent: 10,
                hpMax: 10,
                hpTemp: 2
              },
              rolls: [10, 3]
            });

          const noOp =
            await execute({
              rolls: [10, 1],
              mutateRequest: request => {
                request.action.damageComponents[0].roll.formula =
                  '1d6 - 1';
              }
            });

          return {
            hit,
            equality,
            miss,
            tempHp,
            noOp
          };
        }
      );

    expect(result.hit.resolution.outcome).toBe('hit');
    expect(result.hit.resolution.attackRoll.total).toBe(14);
    expect(result.hit.resolution.damageComponents).toHaveLength(1);
    expect(result.hit.resolution.damageComponents[0].roll.total).toBe(5);
    expect(result.hit.resolution.health.after).toEqual({
      hpCurrent: 5,
      hpMax: 10,
      hpTemp: 0
    });
    expect(result.hit.resolution.actor).toEqual({
      participantId: 'token:actor',
      tokenId: 'actor',
      pageId: 'actor-page'
    });
    expect(result.hit.resolution.target).toEqual({
      participantId: 'token:target',
      tokenId: 'target',
      pageId: 'target-page'
    });
    expect(result.hit.rngCalls).toEqual([[1, 20], [1, 6]]);
    expect(result.hit.effects).toEqual({
      reads: 1,
      writes: 0,
      appends: 0
    });
    expect(result.hit.targetUnchanged).toBe(true);
    expect(result.hit.mapUnchanged).toBe(true);
    expect(result.hit.bodyUnchanged).toBe(true);
    expect(result.hit.frozen).toEqual({
      resolution: true,
      actor: true,
      roll: true,
      health: true
    });

    expect(result.equality.resolution.attackRoll.total).toBe(12);
    expect(result.equality.resolution.outcome).toBe('hit');

    expect(result.miss.resolution.outcome).toBe('miss');
    expect(result.miss.resolution.attackRoll.total).toBe(7);
    expect(result.miss.resolution.damageComponents).toEqual([]);
    expect(result.miss.resolution.health).toBeNull();
    expect(result.miss.rngCalls).toEqual([[1, 20]]);
    expect(result.miss.effects).toEqual({
      reads: 0,
      writes: 0,
      appends: 0
    });

    expect(result.tempHp.resolution.health.before).toEqual({
      hpCurrent: 10,
      hpMax: 10,
      hpTemp: 2
    });
    expect(result.tempHp.resolution.health.after).toEqual({
      hpCurrent: 7,
      hpMax: 10,
      hpTemp: 0
    });

    expect(result.noOp.resolution.outcome).toBe('hit');
    expect(result.noOp.resolution.damageComponents[0].amount).toBe(0);
    expect(result.noOp.resolution.health.mutationPlan.changed).toBe(false);
    expect(result.noOp.resolution.health.mutationPlan.changedFields).toEqual([]);
    expect(result.noOp.targetUnchanged).toBe(true);
  }
);


test(
  'attack rejects stale broken and invalid state without repair or premature RNG',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await page.evaluate(
        async () => {

          const {
            CampaignMapModel
          } = await import('/js/editor/campaignMapModel.js');

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            resolveSingleTargetAttack
          } = await import('/js/combat/combatAttackResolution.js');

          const makePage = id => {

            const wrapper =
              document.createElement('div');

            wrapper.innerHTML =
              createPropertiesBlock({
                cardType: 'character'
              });

            for (const [field, value] of Object.entries({
              hpCurrent: 10,
              hpMax: 10,
              hpTemp: 0,
              armorClass: 12
            })) {

              const control =
                wrapper.querySelector(
                  `[data-property-name="${field}"]`
                );

              control.value = String(value);
              control.setAttribute('value', String(value));
            }

            return {
              id,
              path: `pages/${id}.md`,
              type: 'character',
              content: wrapper.innerHTML
            };
          };

          const makeRequest = () => ({
            kind: 'CombatActionRequest',
            version: 1,
            actionId: 'action-rejection',
            mapPageId: 'map-1',
            sessionId: 'session-1',
            actor: {
              participantId: 'token:actor'
            },
            target: {
              participantId: 'token:target'
            },
            action: {
              type: 'attack',
              definitionId: 'gm-attack',
              label: 'Attack',
              source: {
                kind: 'manual'
              },
              hitPolicy: 'ac-total-v1',
              attackRoll: {
                formula: 'd20 + 4',
                mode: 'normal',
                criticalPolicy: 'none'
              },
              damageComponents: [
                {
                  componentId: 'damage-1',
                  damageType: 'force',
                  roll: {
                    formula: '1d6 + 2',
                    mode: 'normal',
                    criticalPolicy: 'none'
                  }
                }
              ]
            }
          });

          const makeWorld = () => {

            const pages = [
              makePage('actor-page'),
              makePage('target-page')
            ];

            const mapModel =
              new CampaignMapModel({
                tokens: [
                  {
                    tokenId: 'actor',
                    pageId: 'actor-page',
                    sourceMode: 'original'
                  },
                  {
                    tokenId: 'target',
                    pageId: 'target-page',
                    sourceMode: 'original'
                  }
                ],
                initiative: {
                  participants: [
                    {
                      participantId: 'token:actor',
                      tokenId: 'actor',
                      pageId: 'actor-page',
                      sourceMode: 'original'
                    },
                    {
                      participantId: 'token:target',
                      tokenId: 'target',
                      pageId: 'target-page',
                      sourceMode: 'original'
                    }
                  ],
                  activeParticipantId: 'token:actor'
                },
                combatSession: {
                  sessionId: 'session-1',
                  status: 'active',
                  round: 1,
                  participants: [
                    {
                      participantId: 'token:actor'
                    },
                    {
                      participantId: 'token:target'
                    }
                  ]
                }
              });

            return {
              pages,
              mapModel,
              resolvePage: id =>
                pages.find(candidate => candidate.id === id) || null
            };
          };

          const cases = [
            ['inactive', world => {
              world.mapModel.combatSession = null;
            }],
            ['paused', world => {
              world.mapModel.combatSession.status = 'paused';
            }],
            ['finished', world => {
              world.mapModel.combatSession.status = 'finished';
            }],
            ['stale-actor', (world, request) => {
              request.actor.participantId = 'token:target';
            }],
            ['actor-outside-roster', world => {
              world.mapModel.combatSession.participants.shift();
            }],
            ['target-outside-roster', world => {
              world.mapModel.combatSession.participants.pop();
            }],
            ['missing-participant', world => {
              world.mapModel.initiative.participants.pop();
            }],
            ['missing-token', world => {
              world.mapModel.tokens.pop();
            }],
            ['missing-page', world => {
              world.pages.pop();
            }],
            ['inconsistent-page', world => {
              world.mapModel.initiative.participants[1].pageId =
                'actor-page';
            }],
            ['same-page', world => {
              world.mapModel.initiative.participants[1].pageId =
                'actor-page';
              world.mapModel.tokens[1].pageId =
                'actor-page';
            }],
            ['unsupported-character', world => {
              world.pages[1].content =
                '<p>Legacy or empty source</p>';
            }],
            ['map-mismatch', (world, request) => {
              request.mapPageId = 'other-map';
            }],
            ['session-mismatch', (world, request) => {
              request.sessionId = 'other-session';
            }]
          ];

          const failures = {};

          for (const [name, mutate] of cases) {

            const world =
              makeWorld();

            const request =
              makeRequest();

            mutate(world, request);

            const before =
              JSON.stringify({
                map: world.mapModel.toJSON(),
                pages: world.pages
              });

            let rngCalls = 0;

            try {

              await resolveSingleTargetAttack(
                request,
                {
                  mapPageId: 'map-1',
                  mapModel: world.mapModel,
                  pages: world.pages,
                  resolvePage: world.resolvePage,
                  randomInt: () => {
                    rngCalls += 1;
                    return 10;
                  }
                }
              );

              failures[name] = {
                code: 'accepted',
                rngCalls
              };

            } catch (error) {

              failures[name] = {
                code: error.code,
                rngCalls,
                unchanged:
                  JSON.stringify({
                    map: world.mapModel.toJSON(),
                    pages: world.pages
                  }) === before
              };
            }
          }

          const malformed = {};

          for (const [name, mutate] of [
            ['attack-formula', request => {
              request.action.attackRoll.formula = '2d20 + 4';
            }],
            ['damage-formula', request => {
              request.action.damageComponents[0].roll.formula = 'bad';
            }],
            ['unknown-key', request => {
              request.action.metadata = {};
            }]
          ]) {

            const world =
              makeWorld();

            const request =
              makeRequest();

            mutate(request);

            let rngCalls = 0;

            try {

              await resolveSingleTargetAttack(
                request,
                {
                  mapPageId: 'map-1',
                  mapModel: world.mapModel,
                  pages: world.pages,
                  resolvePage: world.resolvePage,
                  randomInt: () => {
                    rngCalls += 1;
                    return 10;
                  }
                }
              );

              malformed[name] = {
                code: 'accepted',
                rngCalls
              };

            } catch (error) {

              malformed[name] = {
                code: error.code,
                rngCalls
              };
            }
          }

          const damageFailureWorld =
            makeWorld();

          let damageFailureRngCalls = 0;
          let damageFailureWrites = 0;
          let damageFailureCode = '';

          try {

            await resolveSingleTargetAttack(
              makeRequest(),
              {
                mapPageId: 'map-1',
                mapModel: damageFailureWorld.mapModel,
                pages: damageFailureWorld.pages,
                resolvePage: damageFailureWorld.resolvePage,
                storageAdapter: {
                  readText: async () => {
                    throw new Error('Health preparation must not start.');
                  },
                  writeText: async () => {
                    damageFailureWrites += 1;
                  }
                },
                randomInt: () => {
                  damageFailureRngCalls += 1;

                  if (damageFailureRngCalls === 2) {
                    throw new Error('damage RNG failed');
                  }

                  return 10;
                }
              }
            );

          } catch (error) {

            damageFailureCode =
              error.code;
          }

          const invalidHealthWorld =
            makeWorld();

          const hpTemp =
            document.createElement('div');

          hpTemp.innerHTML =
            invalidHealthWorld.pages[1].content;

          hpTemp.querySelector(
            '[data-property-name="hpTemp"]'
          ).remove();

          invalidHealthWorld.pages[1].content =
            hpTemp.innerHTML;

          let invalidHealthCode = '';
          let invalidHealthRngCalls = 0;
          let invalidHealthWrites = 0;

          try {

            await resolveSingleTargetAttack(
              makeRequest(),
              {
                mapPageId: 'map-1',
                mapModel: invalidHealthWorld.mapModel,
                pages: invalidHealthWorld.pages,
                resolvePage: invalidHealthWorld.resolvePage,
                storageAdapter: {
                  readText: async () => invalidHealthWorld.pages[1].content,
                  writeText: async () => {
                    invalidHealthWrites += 1;
                  }
                },
                randomInt: (min, max) => {
                  invalidHealthRngCalls += 1;
                  return max === 20 ? 10 : 3;
                }
              }
            );

          } catch (error) {

            invalidHealthCode =
              error.code;
          }

          return {
            failures,
            malformed,
            damageFailure: {
              code: damageFailureCode,
              rngCalls: damageFailureRngCalls,
              writes: damageFailureWrites
            },
            invalidHealth: {
              code: invalidHealthCode,
              rngCalls: invalidHealthRngCalls,
              writes: invalidHealthWrites
            }
          };
        }
      );

    expect(result.failures).toEqual({
      inactive: {
        code: 'COMBAT_ATTACK_COMBAT_NOT_ACTIVE',
        rngCalls: 0,
        unchanged: true
      },
      paused: {
        code: 'COMBAT_ATTACK_COMBAT_NOT_ACTIVE',
        rngCalls: 0,
        unchanged: true
      },
      finished: {
        code: 'COMBAT_ATTACK_COMBAT_NOT_ACTIVE',
        rngCalls: 0,
        unchanged: true
      },
      'stale-actor': {
        code: 'COMBAT_ATTACK_ACTOR_NOT_CURRENT',
        rngCalls: 0,
        unchanged: true
      },
      'actor-outside-roster': {
        code: 'COMBAT_ATTACK_ACTOR_NOT_IN_ROSTER',
        rngCalls: 0,
        unchanged: true
      },
      'target-outside-roster': {
        code: 'COMBAT_ATTACK_TARGET_NOT_IN_ROSTER',
        rngCalls: 0,
        unchanged: true
      },
      'missing-participant': {
        code: 'COMBAT_ATTACK_PARTICIPANT_MISSING',
        rngCalls: 0,
        unchanged: true
      },
      'missing-token': {
        code: 'COMBAT_ATTACK_TOKEN_MISSING',
        rngCalls: 0,
        unchanged: true
      },
      'missing-page': {
        code: 'COMBAT_ATTACK_PAGE_MISSING',
        rngCalls: 0,
        unchanged: true
      },
      'inconsistent-page': {
        code: 'COMBAT_ATTACK_REFERENCE_INCONSISTENT',
        rngCalls: 0,
        unchanged: true
      },
      'same-page': {
        code: 'COMBAT_ATTACK_SAME_CHARACTER_PAGE',
        rngCalls: 0,
        unchanged: true
      },
      'unsupported-character': {
        code: 'COMBAT_ATTACK_CHARACTER_UNSUPPORTED',
        rngCalls: 0,
        unchanged: true
      },
      'map-mismatch': {
        code: 'COMBAT_ATTACK_MAP_MISMATCH',
        rngCalls: 0,
        unchanged: true
      },
      'session-mismatch': {
        code: 'COMBAT_ATTACK_SESSION_MISMATCH',
        rngCalls: 0,
        unchanged: true
      }
    });

    expect(result.malformed).toEqual({
      'attack-formula': {
        code: 'COMBAT_ACTION_INVALID_ATTACK_ROLL',
        rngCalls: 0
      },
      'damage-formula': {
        code: 'COMBAT_ACTION_INVALID_DAMAGE_ROLL',
        rngCalls: 0
      },
      'unknown-key': {
        code: 'COMBAT_ACTION_INVALID_REQUEST',
        rngCalls: 0
      }
    });

    expect(result.damageFailure).toEqual({
      code: 'COMBAT_ATTACK_DAMAGE_ROLL_FAILED',
      rngCalls: 2,
      writes: 0
    });

    expect(result.invalidHealth).toEqual({
      code: 'COMBAT_ATTACK_HEALTH_PREPARATION_FAILED',
      rngCalls: 2,
      writes: 0
    });
  }
);
