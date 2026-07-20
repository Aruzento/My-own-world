import {
  expect,
  test
} from '@playwright/test';


test(
  'tree-render-escapes-user-title-html',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setPages
          } = await import('/js/stateActions.js');

          const {
            renderTree
          } = await import('/js/tree/tree.js');

          const maliciousTitle =
            '<img src=x onerror="window.__treeTitleInjected=true">Evil';

          window.__treeTitleInjected =
            false;

          setPages([
            {
              id: 'malicious-title-page',
              title: maliciousTitle,
              parent: null,
              order: 1,
              tags: ['note'],
              aliases: [],
              content: '',
              type: 'note'
            }
          ]);

          renderTree();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const item =
            document.querySelector(
              '.tree-item[data-page-id="malicious-title-page"]'
            );

          const label =
            item?.querySelector(
              '.tree-label'
            );

          return {
            labelText:
              label?.textContent || '',
            labelHTML:
              label?.innerHTML || '',
            injected:
              window.__treeTitleInjected,
            imageCount:
              item?.querySelectorAll(
                '.tree-label img'
              ).length || 0,
            treeIconCount:
              item?.querySelectorAll(
                '.tree-title .entity-icon-svg'
              ).length || 0
          };
        }
      );

    expect(
      result.labelText
    ).toBe(
      '<img src=x onerror="window.__treeTitleInjected=true">Evil'
    );

    expect(
      result.labelHTML
    ).toContain(
      '&lt;img'
    );

    expect(
      result.imageCount
    ).toBe(
      0
    );

    expect(
      result.injected
    ).toBe(
      false
    );

    expect(
      result.treeIconCount
    ).toBe(
      1
    );
  }
);


test(
  'runtime-label-renderers-keep-aliases-and-tags-as-text',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            renderAliases
          } = await import('/js/ui/aliases.js');

          const {
            renderTags
          } = await import('/js/ui/ui.js');

          const host =
            document.createElement('div');

          host.innerHTML = `
            <div id="tagList"></div>
            <div class="inline-tag-list"></div>
            <div class="inline-alias-list"></div>
          `;

          document.body.appendChild(
            host
          );

          const malicious =
            '<img src=x onerror="window.__runtimeLabelInjected=true">Label';

          window.__runtimeLabelInjected =
            false;

          renderTags([
            malicious
          ]);

          renderAliases([
            malicious
          ]);

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          return {
            injected:
              window.__runtimeLabelInjected,
            tagText:
              host.querySelector('.inline-tag-label')?.textContent || '',
            aliasText:
              host.querySelector('.inline-alias-label')?.textContent || '',
            runtimeImages:
              host.querySelectorAll(
                '.inline-tag-list img, .inline-alias-list img, #tagList img'
              ).length,
            removeTagDataset:
              host.querySelector('.inline-tag-remove')?.dataset.tag || '',
            removeAliasDataset:
              host.querySelector('.inline-alias-remove')?.dataset.alias || ''
          };
        }
      );

    expect(
      result.injected
    ).toBe(
      false
    );

    expect(
      result.runtimeImages
    ).toBe(
      0
    );

    expect(
      result.tagText
    ).toBe(
      '#<img src=x onerror="window.__runtimeLabelInjected=true">Label'
    );

    expect(
      result.aliasText
    ).toBe(
      '<img src=x onerror="window.__runtimeLabelInjected=true">Label'
    );

    expect(
      result.removeTagDataset
    ).toBe(
      '<img src=x onerror="window.__runtimeLabelInjected=true">Label'
    );

    expect(
      result.removeAliasDataset
    ).toBe(
      '<img src=x onerror="window.__runtimeLabelInjected=true">Label'
    );
  }
);


test(
  'remaining-runtime-text-renderers-keep-user-html-inert',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const malicious =
            '<img src=x onerror="window.__remainingRuntimeInjected=true">Text';

          window.__remainingRuntimeInjected =
            false;

          const taskHost =
            document.createElement('div');

          const {
            getTaskTrackerBoardHTML
          } = await import('/js/taskTracker/taskTrackerBoardHTML.js');

          taskHost.innerHTML =
            getTaskTrackerBoardHTML({
              columns: [
                {
                  id: 'column',
                  title: malicious,
                  taskIds: ['task']
                }
              ],
              tasks: [
                {
                  id: 'task',
                  title: malicious,
                  description: malicious,
                  checklist: [
                    {
                      id: 'check',
                      text: malicious,
                      done: false
                    }
                  ]
                }
              ]
            });

          document.body.appendChild(
            taskHost
          );

          const mapHost =
            document.createElement('div');

          const {
            serializeCampaignMapModelHTML
          } = await import('/js/editor/campaignMapDataSerializer.js');

          mapHost.innerHTML =
            serializeCampaignMapModelHTML({
              title: malicious,
              model: {}
            });

          document.body.appendChild(
            mapHost
          );

          const graphHost =
            document.createElement('div');

          graphHost.innerHTML = `
            <div class="knowledge-graph-document" contenteditable="false"></div>
          `;

          document.body.appendChild(
            graphHost
          );

          const {
            state
          } = await import('/js/state.js');

          state.pages = [
            {
              id: 'source',
              title: malicious,
              parent: null,
              order: 1,
              tags: [],
              aliases: [],
              type: 'note',
              template: 'card',
              relationships: [
                {
                  type: 'related',
                  targetId: 'target',
                  label: malicious
                }
              ],
              content: ''
            },
            {
              id: 'target',
              title: malicious,
              parent: null,
              order: 2,
              tags: [],
              aliases: [],
              type: 'note',
              template: 'card',
              content: ''
            }
          ];

          const {
            renderKnowledgeGraphPage
          } = await import('/js/wiki/knowledgeGraphPage.js');

          renderKnowledgeGraphPage(
            graphHost
          );

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          return {
            injected:
              window.__remainingRuntimeInjected,
            taskImages:
              taskHost.querySelectorAll('img').length,
            taskTitle:
              taskHost.querySelector('.task-card-title')?.value || '',
            taskDescription:
              taskHost.querySelector('.task-card-description')?.value || '',
            taskChecklist:
              taskHost.querySelector('.task-check-text')?.value || '',
            mapImages:
              mapHost.querySelectorAll('img').length,
            mapTitle:
              mapHost.querySelector('.campaign-map-title')?.textContent.trim() || '',
            graphImages:
              graphHost.querySelectorAll('img').length,
            graphNodeText:
              graphHost.querySelector('[data-node-id="target"] strong')?.textContent.trim() || ''
          };
        }
      );

    expect(
      result.injected
    ).toBe(
      false
    );

    expect(
      result.taskImages
    ).toBe(
      0
    );

    expect(
      result.taskTitle
    ).toBe(
      '<img src=x onerror="window.__remainingRuntimeInjected=true">Text'
    );

    expect(
      result.taskDescription
    ).toBe(
      '<img src=x onerror="window.__remainingRuntimeInjected=true">Text'
    );

    expect(
      result.taskChecklist
    ).toBe(
      '<img src=x onerror="window.__remainingRuntimeInjected=true">Text'
    );

    expect(
      result.mapImages
    ).toBe(
      0
    );

    expect(
      result.mapTitle
    ).toBe(
      '<img src=x onerror="window.__remainingRuntimeInjected=true">Text'
    );

    expect(
      result.graphImages
    ).toBe(
      0
    );

    expect(
      result.graphNodeText
    ).toBe(
      '<img src=x onerror="window.__remainingRuntimeInjected=true">Text'
    );
  }
);
