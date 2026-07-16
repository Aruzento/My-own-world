import {
  expect,
  test
} from '@playwright/test';


// P1 visual smoke: тест не сравнивает пиксели с эталоном, а сохраняет
// скриншоты ключевых экранов и проверяет частые визуальные поломки layout.

test(
  'visual-safety-captures-core-surfaces',
  async ({ page }, testInfo) => {

    await page.setViewportSize({
      width: 1280,
      height: 820
    });

    await page.goto(
      '/'
    );

    await expect(
      page.locator('.sidebar-title')
    ).toHaveText(
      'MyWorld'
    );

    await attachScreenshot(
      page,
      testInfo,
      'visual-app-shell'
    );

    await page.evaluate(
      async () => {

        const {
          createCardShellTemplate
        } = await import('/js/templates/cardShell.js');

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createCardShellTemplate().content;

        editor.querySelector('h1').textContent =
          'Визуальная карточка';

        editor.querySelector('.card-short-description').textContent =
          'Короткое описание для проверки мягкого блока карточки.';

        editor.querySelector('.rich-text-field:last-child').textContent =
          'Основной текст карточки, который нужен для проверки редактора.';
      }
    );

    await attachLocatorScreenshot(
      page.locator('.editor-surface'),
      testInfo,
      'visual-card-editor'
    );

    await page.evaluate(
      async () => {

        const {
          createCampaignMapTemplate
        } = await import('/js/templates/campaignMap.js');

        const {
          getCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        const {
          createMapShapeElement,
          createMapTokenElement
        } = await import('/js/editor/campaignMapElementFactory.js');

        const {
          renderLockedFogZones
        } = await import('/js/editor/campaignMapFog.js');

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createCampaignMapTemplate().content;

        const map =
          editor.querySelector('.campaign-map-document');

        const stage =
          map.querySelector('.campaign-map-stage');

        const viewport =
          map.querySelector('.campaign-map-viewport');

        const layer =
          map.querySelector('.campaign-map-object-layer');

        stage.style.height =
          '560px';

        stage.dataset.grid =
          'true';

        stage.dataset.viewZoom =
          '1';

        viewport.style.width =
          '2000px';

        viewport.style.height =
          '1200px';

        const store =
          getCampaignMapStore(
            map
          );

        const token =
          store.addToken({
            tokenId: 'visual-token',
            type: 'creature',
            name: 'Страж',
            x: 18,
            y: 22,
            size: 1,
            presentationHidden: true,
            isPlayerToken: true
          });

        const object =
          store.addToken({
            tokenId: 'visual-object',
            type: 'object',
            name: 'Алтарь',
            x: 28,
            y: 30,
            size: 1.6,
            rotation: 24
          });

        const shape =
          store.addShape({
            shapeId: 'visual-shape',
            type: 'square',
            x: 520,
            y: 260,
            width: 180,
            height: 130
          });

        store.updateFog({
          lockedZones: [
            {
              id: 'visual-locked-zone',
              x: 720,
              y: 230,
              width: 220,
              height: 160
            }
          ]
        });

        layer.append(
          createMapTokenElement(
            token
          ),
          createMapTokenElement(
            object
          ),
          createMapShapeElement(
            shape
          )
        );

        renderLockedFogZones(
          map
        );

        store.commitToDOM();
      }
    );

    await attachLocatorScreenshot(
      page.locator('.campaign-map-document'),
      testInfo,
      'visual-campaign-map'
    );

    await page.evaluate(
      async () => {

        const {
          createTaskTrackerTemplate
        } = await import('/js/templates/taskTracker.js');

        const {
          renderTaskTracker
        } = await import('/js/taskTracker/taskTrackerRender.js');

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createTaskTrackerTemplate().content;

        renderTaskTracker(
          editor
        );
      }
    );

    await attachLocatorScreenshot(
      page.locator('.task-tracker-document'),
      testInfo,
      'visual-task-tracker'
    );
  }
);


test(
  'visual-layout-guards-common-regressions',
  async ({ page }) => {

    await page.setViewportSize({
      width: 760,
      height: 560
    });

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            positionPopupAtPoint
          } = await import('/js/ui/popupPosition.js');

          const {
            createMapShapeElement,
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            getCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            renderLockedFogZones
          } = await import('/js/editor/campaignMapFog.js');

          const {
            startCampaignMapSelectionBox,
            moveCampaignMapSelectionBox,
            finishCampaignMapSelectionBox
          } = await import('/js/editor/campaignMapSelectionBox.js');

          const popup =
            document.createElement('div');

          popup.className =
            'campaign-map-popup';

          popup.style.position =
            'fixed';

          popup.style.width =
            '320px';

          popup.style.height =
            '220px';

          document.body.appendChild(
            popup
          );

          positionPopupAtPoint(
            popup,
            740,
            540,
            {
              fallbackWidth: 320,
              fallbackHeight: 220
            }
          );

          const popupRect =
            popup.getBoundingClientRect();

          const toolbar =
            document.querySelector('#floatingToolbar');

          toolbar.classList.remove(
            'hidden'
          );

          toolbar.style.left =
            '380px';

          toolbar.style.top =
            '40px';

          const toolbarWidthBefore =
            toolbar.getBoundingClientRect().width;

          document.querySelector('#editorArea').innerHTML = `
            <div
              class="campaign-map-document"
              data-campaign-map="v1"
              contenteditable="false"
            >
              <div
                class="campaign-map-stage"
                data-grid="true"
                data-fog-mode="draw"
                data-fog-image=""
                data-view-zoom="1"
                contenteditable="false"
                style="width: 700px; height: 420px;"
              >
                <div class="campaign-map-viewport" style="width: 2000px; height: 1200px;">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            document.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          const layer =
            map.querySelector('.campaign-map-object-layer');

          const fog =
            map.querySelector('.campaign-map-fog-canvas');

          const store =
            getCampaignMapStore(
              map
            );

          const selectedToken =
            store.addToken({
              tokenId: 'selected-token',
              type: 'creature',
              name: 'Воин',
              x: 5,
              y: 8,
              size: 1,
              presentationHidden: true
            });

          const outsideToken =
            store.addToken({
              tokenId: 'outside-token',
              type: 'creature',
              name: 'Дальше',
              x: 80,
              y: 80,
              size: 1
            });

          const selectedShape =
            store.addShape({
              shapeId: 'selected-shape',
              type: 'square',
              x: 160,
              y: 140,
              width: 90,
              height: 70
            });

          store.updateFog({
            lockedZones: [
              {
                id: 'visual-zone',
                x: 260,
                y: 150,
                width: 130,
                height: 90
              }
            ]
          });

          layer.append(
            createMapTokenElement(
              selectedToken
            ),
            createMapTokenElement(
              outsideToken
            ),
            createMapShapeElement(
              selectedShape
            )
          );

          renderLockedFogZones(
            map
          );

          store.commitToDOM();

          const selectionEvent =
            (clientX, clientY) => ({
              clientX,
              clientY,
              preventDefault() {},
              stopPropagation() {}
            });

          const stageRect =
            stage.getBoundingClientRect();

          startCampaignMapSelectionBox(
            selectionEvent(
              stageRect.left + 20,
              stageRect.top + 20
            ),
            stage
          );

          moveCampaignMapSelectionBox(
            selectionEvent(
              stageRect.left + 360,
              stageRect.top + 260
            )
          );

          finishCampaignMapSelectionBox(
            selectionEvent(
              stageRect.left + 360,
              stageRect.top + 260
            )
          );

          const token =
            map.querySelector('[data-token-id="selected-token"]');

          const hiddenBadgeContent =
            getComputedStyle(
              token,
              '::before'
            ).content;

          const hiddenBadgeFont =
            getComputedStyle(
              token,
              '::before'
            ).fontSize;

          const toolbarWidthAfter =
            toolbar.getBoundingClientRect().width;

          return {
            popupInsideViewport:
              popupRect.left >= 0 &&
              popupRect.top >= 0 &&
              popupRect.right <= window.innerWidth &&
              popupRect.bottom <= window.innerHeight,
            toolbarWidthBefore,
            toolbarWidthAfter,
            selectedToken:
              token.classList.contains('is-selected'),
            outsideToken:
              map
                .querySelector('[data-token-id="outside-token"]')
                .classList.contains('is-selected'),
            selectedShape:
              map
                .querySelector('[data-shape-id="selected-shape"]')
                .classList.contains('is-selected'),
            fogZIndex:
              Number(getComputedStyle(fog).zIndex),
            tokenZIndex:
              Number(getComputedStyle(token).zIndex),
            lockedZoneZIndex:
              Number(getComputedStyle(
                map.querySelector('.campaign-fog-locked-zone')
              ).zIndex),
            hiddenBadgeContent,
            hiddenBadgeFont
          };
        }
      );

    expect(
      result.popupInsideViewport
    ).toBe(
      true
    );

    expect(
      Math.round(result.toolbarWidthBefore)
    ).toBe(
      454
    );

    expect(
      Math.round(result.toolbarWidthAfter)
    ).toBe(
      454
    );

    expect(
      result.selectedToken
    ).toBe(
      true
    );

    expect(
      result.selectedShape
    ).toBe(
      true
    );

    expect(
      result.outsideToken
    ).toBe(
      false
    );

    expect(
      result.fogZIndex
    ).toBeGreaterThan(
      result.tokenZIndex
    );

    expect(
      result.lockedZoneZIndex
    ).toBeGreaterThan(
      result.fogZIndex
    );

    expect(
      result.hiddenBadgeContent
    ).toContain(
      'скрыт'
    );

    expect(
      Number.parseFloat(result.hiddenBadgeFont)
    ).toBeLessThanOrEqual(
      9
    );
  }
);


async function attachScreenshot(
  page,
  testInfo,
  name
) {

  await testInfo.attach(
    `${name}.png`,
    {
      body: await page.screenshot({
        fullPage: false
      }),
      contentType: 'image/png'
    }
  );
}


async function attachLocatorScreenshot(
  locator,
  testInfo,
  name
) {

  await testInfo.attach(
    `${name}.png`,
    {
      body: await locator.screenshot(),
      contentType: 'image/png'
    }
  );
}
