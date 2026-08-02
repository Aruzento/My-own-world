import {
  expect,
  test
} from '@playwright/test';


const PERFORMANCE_BUDGETS_MS =
  Object.freeze({
    treeInitialRender: 900,
    treeScrollRender: 240,
    campaignMapRender: 1500,
    knowledgeGraphRender: 1800,
    taskTrackerRender: 900,
    totalMeasured: 4600
  });


test(
  'ui-polish-runtime-surfaces-render-large-workloads-inside-budgets',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const pages =
      createSyntheticPages(
        420
      );

    const taskTrackerData =
      createSyntheticTaskTrackerData({
        taskCount:
          96
      });

    const result =
      await page.evaluate(
        async ({
          budgets,
          pages,
          taskTrackerData
        }) => {

          const nextFrame =
            () => new Promise(resolve =>
              requestAnimationFrame(
                () => requestAnimationFrame(resolve)
              )
            );

          const files =
            new Map();

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'UI performance workspace'
              };
            },
            setWorkspaceHandle() {},
            async pickWorkspace() {
              return {};
            },
            async restoreWorkspace() {
              return {};
            },
            async ensureDirectory() {},
            async getDirectoryHandle() {
              return {};
            },
            async readText(path) {
              return files.get(path) || '';
            },
            async writeText(path, content) {
              files.set(
                path,
                String(content)
              );
            },
            async readBinary() {
              return new ArrayBuffer(0);
            },
            async writeBinary() {},
            async listFiles() {
              return [];
            },
            async removeFile() {},
            async removeDirectory() {}
          });

          const {
            setPages,
            setWorkspaceHandle
          } = await import('/js/stateActions.js');

          setWorkspaceHandle({
            name:
              'UI performance workspace'
          });

          setPages(
            pages
          );

          const editor =
            document.querySelector('#editorArea');

          const tree =
            document.querySelector('#tree');

          tree.style.height =
            '640px';

          const {
            renderTree
          } = await import('/js/tree/tree.js');

          const treeStartedAt =
            performance.now();

          renderTree();

          await nextFrame();

          const treeInitialRender =
            performance.now() - treeStartedAt;

          const treeInitialDomRows =
            tree.querySelectorAll('.tree-item').length;

          const treeScrollStartedAt =
            performance.now();

          tree.scrollTop =
            tree.scrollHeight;

          tree.dispatchEvent(
            new Event(
              'scroll',
              {
                bubbles:
                  true
              }
            )
          );

          await nextFrame();

          const treeScrollRender =
            performance.now() - treeScrollStartedAt;

          const treeScrolledDomRows =
            tree.querySelectorAll('.tree-item').length;

          const {
            createCampaignMapTemplate
          } = await import('/js/templates/campaignMap.js');

          const {
            renderCampaignMap
          } = await import('/js/editor/campaignMap.js');

          const {
            CampaignMapModel
          } = await import('/js/editor/campaignMapModel.js');

          const {
            createCampaignMapStressModelData
          } = await import('/js/editor/campaignMapPerformance.js');

          const {
            createMapShapeElement,
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          editor.innerHTML =
            createCampaignMapTemplate().content;

          const map =
            editor.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          stage.style.width =
            '1120px';

          stage.style.height =
            '720px';

          const layer =
            map.querySelector('.campaign-map-object-layer');

          const mapModel =
            new CampaignMapModel(
              createCampaignMapStressModelData({
                tokenCount:
                  180,
                shapeCount:
                  80,
                layerCount:
                  8,
                dirtyFogRegionCount:
                  120
              })
            );

          mapModel.commitToElement(
            map
          );

          mapModel.tokens.forEach(token =>
            layer.appendChild(
              createMapTokenElement(
                token
              )
            )
          );

          mapModel.shapes.forEach(shape =>
            layer.appendChild(
              createMapShapeElement(
                shape
              )
            )
          );

          const mapStartedAt =
            performance.now();

          await renderCampaignMap(
            editor
          );

          await nextFrame();

          const campaignMapRender =
            performance.now() - mapStartedAt;

          const mapTokens =
            map.querySelectorAll('.campaign-map-token').length;

          const mapShapes =
            map.querySelectorAll('.campaign-map-shape').length;

          const {
            createKnowledgeGraphTemplate
          } = await import('/js/templates/knowledgeGraph.js');

          const {
            renderKnowledgeGraphPage
          } = await import('/js/wiki/knowledgeGraphPage.js');

          editor.innerHTML =
            createKnowledgeGraphTemplate().content;

          const graphStartedAt =
            performance.now();

          renderKnowledgeGraphPage(
            editor
          );

          await nextFrame();

          editor
            .querySelector('[data-knowledge-graph-slice-action="show-all"]')
            ?.click();

          await nextFrame();

          const knowledgeGraphRender =
            performance.now() - graphStartedAt;

          const graphNodes =
            editor.querySelectorAll('[data-knowledge-graph-canvas-card]').length;

          const graphEdges =
            editor.querySelectorAll('[data-knowledge-graph-canvas-edge]').length;

          const {
            createTaskTrackerTemplate
          } = await import('/js/templates/taskTracker.js');

          const {
            renderTaskTracker
          } = await import('/js/taskTracker/taskTracker.js');

          editor.innerHTML =
            createTaskTrackerTemplate().content;

          editor.querySelector('.task-tracker-data').textContent =
            JSON.stringify(
              taskTrackerData
            );

          const taskTrackerStartedAt =
            performance.now();

          renderTaskTracker(
            editor
          );

          await nextFrame();

          const taskTrackerRender =
            performance.now() - taskTrackerStartedAt;

          const taskCards =
            editor.querySelectorAll('.task-card').length;

          const measurements = {
            treeInitialRender,
            treeScrollRender,
            campaignMapRender,
            knowledgeGraphRender,
            taskTrackerRender
          };

          const warnings =
            Object
              .entries(measurements)
              .filter(([metric, value]) =>
                value > budgets[metric]
              )
              .map(([metric, value]) => ({
                metric,
                value,
                budget:
                  budgets[metric]
              }));

          const totalMeasured =
            Object
              .values(measurements)
              .reduce(
                (sum, value) => sum + value,
                0
              );

          if (
            totalMeasured > budgets.totalMeasured
          ) {

            warnings.push({
              metric:
                'totalMeasured',
              value:
                totalMeasured,
              budget:
                budgets.totalMeasured
            });
          }

          return {
            measurements,
            totalMeasured,
            warnings,
            domCounts: {
              treeInitialDomRows,
              treeScrolledDomRows,
              treeTotalRows:
                pages.length,
              mapTokens,
              mapShapes,
              graphNodes,
              graphEdges,
              taskCards
            }
          };
        },
        {
          budgets:
            PERFORMANCE_BUDGETS_MS,
          pages,
          taskTrackerData
        }
      );

    expect(
      result.warnings
    ).toEqual(
      []
    );

    expect(
      result.domCounts.treeTotalRows
    ).toBe(
      420
    );

    expect(
      result.domCounts.treeInitialDomRows
    ).toBeGreaterThan(
      8
    );

    expect(
      result.domCounts.treeInitialDomRows
    ).toBeLessThan(
      80
    );

    expect(
      result.domCounts.treeScrolledDomRows
    ).toBeLessThan(
      80
    );

    expect(
      result.domCounts.mapTokens
    ).toBe(
      180
    );

    expect(
      result.domCounts.mapShapes
    ).toBe(
      80
    );

    expect(
      result.domCounts.graphNodes
    ).toBeGreaterThanOrEqual(
      90
    );

    expect(
      result.domCounts.graphEdges
    ).toBeGreaterThanOrEqual(
      90
    );

    expect(
      result.domCounts.taskCards
    ).toBe(
      96
    );
  }
);


function createSyntheticPages(
  count
) {

  const types =
    [
      'note',
      'character',
      'item',
      'location',
      'ruleTree'
    ];

  return Array.from(
    {
      length:
        count
    },
    (_, index) => {

      const id =
        `perf-page-${index}`;

      const parent =
        index === 0
          ? null
          : `perf-page-${Math.floor((index - 1) / 4)}`;

      const type =
        types[index % types.length];

      const targetId =
        `perf-page-${Math.max(0, index - 3)}`;

      const title =
        index === 0
          ? 'Performance Root'
          : `Performance Node ${index}`;

      return {
        id,
        name:
          `${id}.md`,
        path:
          `/pages/${id}.md`,
        order:
          index + 1,
        title,
        parent,
        template:
          type === 'ruleTree'
            ? 'ruleTree'
            : 'card',
        type,
        tags:
          index % 11 === 0
            ? ['faction']
            : [],
        aliases:
          [],
        relationships:
          index > 2
            ? [
              {
                type:
                  index % 4 === 0
                    ? 'ally'
                    : 'related',
                targetId,
                label:
                  'Synthetic link'
              }
            ]
            : [],
        content:
          `<h1>${title}</h1><p>Linked to [[Performance Node ${Math.max(0, index - 1)}]].</p>`
      };
    }
  );
}


function createSyntheticTaskTrackerData({
  taskCount
}) {

  const columns =
    [
      {
        id:
          'perf-backlog',
        title:
          'Backlog',
        taskIds:
          []
      },
      {
        id:
          'perf-progress',
        title:
          'Progress',
        taskIds:
          []
      },
      {
        id:
          'perf-done',
        title:
          'Done',
        taskIds:
          []
      }
    ];

  const tasks =
    Array.from(
      {
        length:
          taskCount
      },
      (_, index) => {

        const id =
          `perf-task-${index}`;

        columns[index % columns.length].taskIds.push(
          id
        );

        return {
          id,
          title:
            `Task ${index + 1}`,
          description:
            index % 3 === 0
              ? 'Short synthetic task description.'
              : '',
          checklist:
            [
              {
                id:
                  `${id}-check-1`,
                text:
                  'Outline',
                done:
                  index % 2 === 0
              },
              {
                id:
                  `${id}-check-2`,
                text:
                  'Review',
                done:
                  false
              }
            ]
        };
      }
    );

  return {
    version:
      1,
    columns,
    tasks
  };
}
