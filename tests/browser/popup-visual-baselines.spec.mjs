import {
  expect,
  test
} from '@playwright/test';


const POPUP_VIEWPORTS = [
  {
    name:
      'desktop',
    width:
      1440,
    height:
      900
  },
  {
    name:
      'constrained',
    width:
      960,
    height:
      640
  }
];

const POPUP_SURFACES = [
  {
    name:
      'add-block',
    description:
      'simple Add block popover',
    selector:
      '#blockPopup',
    setup:
      setupAddBlockPopup
  },
  {
    name:
      'properties',
    description:
      'Properties settings popup',
    selector:
      '.property-settings-popup',
    setup:
      setupPropertiesPopup
  },
  {
    name:
      'campaign-map-grid',
    description:
      'Campaign Map grid popup',
    selector:
      '#campaignMapPopup',
    setup:
      setupCampaignMapGridPopup,
    assert:
      assertMapPopupAvoidsInspector
  }
];

const SCREENSHOT_OPTIONS = {
  animations:
    'disabled',
  caret:
    'hide',
  fullPage:
    false,
  maxDiffPixelRatio:
    0.002,
  scale:
    'css',
  threshold:
    0.15
};


test.describe(
  'popup visual baseline candidates',
  () => {

    for (const surface of POPUP_SURFACES) {

      for (const viewport of POPUP_VIEWPORTS) {

        test(
          `${surface.name} candidate baseline at ${viewport.name}`,
          async ({ page }) => {

            await page.setViewportSize({
              width:
                viewport.width,
              height:
                viewport.height
            });

            await page.goto(
              '/'
            );

            await prepareDeterministicWorkbench(
              page
            );

            await surface.setup(
              page
            );

            const popup =
              page.locator(
                surface.selector
              );

            await expect(
              popup
            ).toBeVisible();

            await expectPopupInsideViewport(
              popup
            );

            if (surface.assert) {

              await surface.assert(
                page
              );
            }

            await expect(
              page
            ).toHaveScreenshot(
              `${surface.name}-${viewport.name}.png`,
              SCREENSHOT_OPTIONS
            );
          }
        );
      }
    }
  }
);


async function prepareDeterministicWorkbench(
  page
) {

  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }

      html,
      body {
        scroll-behavior: auto !important;
      }
    `
  });

  await page.evaluate(
    async () => {

      const {
        applyAppearance
      } = await import('/js/ui/themeManager.js');

      const {
        setCurrentPage,
        setPages,
        setWorkspaceHandle
      } = await import('/js/stateActions.js');

      const {
        renderTree
      } = await import('/js/tree/tree.js');

      applyAppearance({
        theme:
          'dark',
        accent:
          'gold',
        background:
          'stone',
        scale:
          'normal'
      });

      const pages =
        [
          {
            id:
              'popup-baseline-root',
            name:
              'popup-baseline-root.md',
            title:
              'Опорная кампания',
            template:
              'card',
            type:
              'folder',
            tags:
              [
                'folder'
              ],
            order:
              1,
            content:
              '<h1>Опорная кампания</h1>'
          },
          {
            id:
              'popup-baseline-page',
            name:
              'popup-baseline-page.md',
            title:
              'Башня у переправы',
            parent:
              'popup-baseline-root',
            template:
              'card',
            type:
              'location',
            tags:
              [
                'card',
                'location'
              ],
            order:
              1,
            content:
              '<h1>Башня у переправы</h1>'
          }
        ];

      setWorkspaceHandle({
        name:
          'Popup Baseline Fixture'
      });

      setPages(
        pages
      );

      setCurrentPage(
        pages[1]
      );

      renderTree();

      const app =
        document.querySelector(
          '.app'
        );

      if (app) {

        app.dataset.popupVisualBaselineCandidates =
          'true';

        app.dataset.sidebarState =
          'expanded';

        app.dataset.rightPanelState =
          'hidden';

        app.style.setProperty(
          '--mow-shell-sidebar-width',
          '292px'
        );
      }

      const rightPanel =
        document.getElementById(
          'appRightPanel'
        );

      rightPanel?.classList.add(
        'hidden'
      );

      rightPanel?.setAttribute(
        'aria-hidden',
        'true'
      );

      rightPanel?.replaceChildren();
    }
  );

  await page.evaluate(
    async () => {

      await document.fonts?.ready;
    }
  );
}


async function setupCardEditor(
  page,
  {
    includeProperties = false
  } = {}
) {

  await page.evaluate(
    async options => {

      const {
        createCardShellTemplate
      } = await import('/js/templates/cardShell.js');

      const {
        createPropertiesBlock
      } = await import('/js/templates/blockTypes.js');

      const {
        renderCustomBlocks,
        setupCustomBlocks
      } = await import('/js/editor/customBlocks.js');

      const {
        applyBlockSystemContract
      } = await import('/js/editor/blocks/blockContract.js');

      const {
        renderCardType
      } = await import('/js/ui/cardType.js');

      const editor =
        document.querySelector(
          '#editorArea'
        );

      editor.innerHTML =
        createCardShellTemplate().content;

      editor.querySelector('h1').textContent =
        'Башня у переправы';

      editor.querySelector('.card-type-select').value =
        options.includeProperties
          ? 'region'
          : 'character';

      editor.querySelector('.card-short-description').textContent =
        'Компактная карточка для кандидатных popup-baseline снимков.';

      editor.querySelector('.rich-text-field:last-child').textContent =
        'Стабильный блок описания держит фон рабочей поверхности предсказуемым.';

      if (options.includeProperties) {

        const main =
          editor.querySelector(
            '.entity-main'
          );

        main.insertAdjacentHTML(
          'afterbegin',
          createPropertiesBlock({
            title:
              'Свойства региона',
            cardType:
              'region'
          })
        );

        const block =
          editor.querySelector(
            '.card-properties-block'
          );

        block.querySelector('[data-property-name="terrain"]').value =
          'Скалы и сосны';

        block.querySelector('[data-property-name="capital"]').value =
          'Серые Башни';

        block.querySelector('[data-property-name="factions"]').value =
          'Дозор перевала';
      }

      setupCustomBlocks(
        editor,
        async () => {}
      );

      applyBlockSystemContract(
        editor
      );

      renderCustomBlocks(
        editor
      );

      renderCardType();
    },
    {
      includeProperties
    }
  );

  await page.locator(
    '.editor-surface'
  ).evaluate(
    element => {

      element.scrollTop =
        0;
    }
  );
}


async function setupAddBlockPopup(
  page
) {

  await setupCardEditor(
    page
  );

  await page.evaluate(
    async () => {

      const {
        openTypePicker
      } = await import('/js/editor/blocks/blockPopup.js');

      openTypePicker(
        document.querySelector('.add-block-btn'),
        async () => {}
      );
    }
  );
}


async function setupPropertiesPopup(
  page
) {

  await setupCardEditor(
    page,
    {
      includeProperties:
        true
    }
  );

  await page.locator(
    '.card-properties-settings-btn'
  ).click();
}


async function setupCampaignMapGridPopup(
  page
) {

  await page.evaluate(
    async () => {

      const {
        createCampaignMapTemplate
      } = await import('/js/templates/campaignMap.js');

      const {
        removeSelectedCampaignMapItems,
        renderCampaignMap
      } = await import('/js/editor/campaignMap.js');

      const {
        refreshCampaignMapStore
      } = await import('/js/editor/campaignMapStore.js');

      const {
        createMapShapeElement,
        createMapTokenElement
      } = await import('/js/editor/campaignMapElementFactory.js');

      const {
        renderMapShapeElement,
        renderMapTokenElement
      } = await import('/js/editor/campaignMapRenderer.js');

      const {
        renderLockedFogZones
      } = await import('/js/editor/campaignMapFog.js');

      const {
        ensureMapSelectionInspector
      } = await import('/js/editor/campaignMapSelectionInspector.js');

      const {
        selectMapToken
      } = await import('/js/editor/campaignMapRuntime.js');

      const {
        openGridPopup
      } = await import('/js/editor/campaignMapToolbarController.js');

      const editor =
        document.querySelector(
          '#editorArea'
        );

      editor.innerHTML =
        createCampaignMapTemplate().content;

      const map =
        editor.querySelector(
          '.campaign-map-document'
        );

      map.querySelector('.campaign-map-title').textContent =
        'Перевал Черного Камня';

      const stage =
        map.querySelector(
          '.campaign-map-stage'
        );

      const viewport =
        map.querySelector(
          '.campaign-map-viewport'
        );

      stage.style.height =
        '500px';

      stage.dataset.grid =
        'true';

      stage.dataset.gridColor =
        '#8c846f';

      stage.dataset.viewZoom =
        '1';

      viewport.style.width =
        '1800px';

      viewport.style.height =
        '1100px';

      await renderCampaignMap(
        editor
      );

      const layer =
        map.querySelector(
          '.campaign-map-object-layer'
        );

      const store =
        refreshCampaignMapStore(
          map
        );

      const token =
        store.addToken({
          tokenId:
            'popup-baseline-token',
          type:
            'creature',
          name:
            'Дозорный',
          x:
            16,
          y:
            18,
          size:
            1,
          hp:
            8,
          hpMax:
            12,
          armorClass:
            14,
          presentationHidden:
            true,
          isPlayerToken:
            true
        });

      const shape =
        store.addShape({
          shapeId:
            'popup-baseline-shape',
          type:
            'square',
          x:
            480,
          y:
            240,
          width:
            170,
          height:
            120,
          rotation:
            18
        });

      store.updateFog({
        lockedZones:
          [
            {
              id:
                'popup-baseline-fog',
              x:
                700,
              y:
                230,
              width:
                220,
              height:
                150
            }
          ]
      });

      const tokenElement =
        createMapTokenElement(
          token
        );

      const shapeElement =
        createMapShapeElement(
          shape
        );

      layer.append(
        tokenElement,
        shapeElement
      );

      await renderMapTokenElement(
        tokenElement
      );

      renderMapShapeElement(
        shapeElement
      );

      renderLockedFogZones(
        map
      );

      store.commitToDOM();

      selectMapToken(
        tokenElement
      );

      ensureMapSelectionInspector(
        map,
        {
          saveAndSync:
            async () => {},
          removeSelected:
            () => removeSelectedCampaignMapItems(map)
        }
      );

      openGridPopup(
        map,
        map.querySelector('.campaign-grid-btn'),
        {
          async saveAndSync() {}
        }
      );
    }
  );

  await page.locator(
    '#campaignMapPopup'
  ).waitFor({
    state:
      'visible'
  });
}


async function expectPopupInsideViewport(
  popup
) {

  const result =
    await popup.evaluate(
      element => {

        const rect =
          element.getBoundingClientRect();

        return {
          bottom:
            rect.bottom,
          height:
            rect.height,
          left:
            rect.left,
          right:
            rect.right,
          top:
            rect.top,
          viewportHeight:
            window.innerHeight,
          viewportWidth:
            window.innerWidth,
          width:
            rect.width
        };
      }
    );

  expect(
    result.width
  ).toBeGreaterThan(
    0
  );

  expect(
    result.height
  ).toBeGreaterThan(
    0
  );

  expect(
    result.left
  ).toBeGreaterThanOrEqual(
    0
  );

  expect(
    result.top
  ).toBeGreaterThanOrEqual(
    0
  );

  expect(
    result.right
  ).toBeLessThanOrEqual(
    result.viewportWidth
  );

  expect(
    result.bottom
  ).toBeLessThanOrEqual(
    result.viewportHeight
  );
}


async function assertMapPopupAvoidsInspector(
  page
) {

  const result =
    await page.evaluate(
      () => {

        const popup =
          document.getElementById(
            'campaignMapPopup'
          );

        const inspector =
          document.querySelector(
            '.campaign-map-properties-panel'
          );

        if (!popup || !inspector) {

          return {
            hasPopup:
              Boolean(popup),
            hasInspector:
              Boolean(inspector),
            overlaps:
              true
          };
        }

        const first =
          popup.getBoundingClientRect();

        const second =
          inspector.getBoundingClientRect();

        const overlaps =
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top;

        return {
          hasPopup:
            true,
          hasInspector:
            true,
          overlaps
        };
      }
    );

  expect(
    result
  ).toEqual({
    hasPopup:
      true,
    hasInspector:
      true,
    overlaps:
      false
  });
}
