import {
  expect,
  test
} from '@playwright/test';


test(
  'popup-manager-closes-by-escape-outside-and-keeps-popup-in-viewport',
  async ({ page }) => {

    await page.setViewportSize({
      width: 720,
      height: 480
    });

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            registerPopup
          } = await import('/js/ui/popupManager.js');

          const anchor =
            document.createElement('button');

          anchor.textContent =
            'anchor';

          anchor.style.position =
            'fixed';

          anchor.style.right =
            '4px';

          anchor.style.bottom =
            '4px';

          document.body.appendChild(
            anchor
          );

          const popup =
            document.createElement('div');

          popup.className =
            'ui-panel hidden';

          popup.style.position =
            'fixed';

          popup.style.width =
            '340px';

          popup.style.height =
            '260px';

          document.body.appendChild(
            popup
          );

          const controller =
            registerPopup({
              popup,
              close: () => popup.classList.add('hidden'),
              anchors: [anchor],
              key: 'test-popup-lifecycle'
            });

          controller.openNearAnchor(
            anchor,
            {
              fallbackWidth: 340,
              fallbackHeight: 260
            }
          );

          const rect =
            popup.getBoundingClientRect();

          const inside =
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= window.innerWidth &&
            rect.bottom <= window.innerHeight;

          const overlayLifecycle =
            popup.dataset.overlayLifecycle;

          const overlayKind =
            popup.dataset.overlayKind;

          const overlayStateAfterOpen =
            popup.dataset.overlayState;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'Escape',
                bubbles: true
              }
            )
          );

          const closedByEscape =
            popup.classList.contains('hidden');

          const overlayStateAfterEscape =
            popup.dataset.overlayState;

          const popupOpenAfterEscape =
            popup.dataset.popupOpen;

          controller.openNearAnchor(
            anchor
          );

          const overlayStateAfterReopen =
            popup.dataset.overlayState;

          document.body.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: 20,
                clientY: 20
              }
            )
          );

          const closedByOutside =
            popup.classList.contains('hidden');

          const overlayStateAfterOutside =
            popup.dataset.overlayState;

          return {
            inside,
            closedByEscape,
            closedByOutside,
            overlayLifecycle,
            overlayKind,
            overlayStateAfterOpen,
            overlayStateAfterEscape,
            overlayStateAfterReopen,
            overlayStateAfterOutside,
            popupOpenAfterEscape,
            zIndex: Number(popup.style.zIndex)
          };
        }
      );

    expect(
      result.inside
    ).toBe(
      true
    );

    expect(
      result.closedByEscape
    ).toBe(
      true
    );

    expect(
      result.closedByOutside
    ).toBe(
      true
    );

    expect(
      result.overlayLifecycle
    ).toBe(
      'popup-manager'
    );

    expect(
      result.overlayKind
    ).toBe(
      'popover'
    );

    expect(
      result.overlayStateAfterOpen
    ).toBe(
      'open'
    );

    expect(
      result.overlayStateAfterEscape
    ).toBe(
      'closed'
    );

    expect(
      result.overlayStateAfterReopen
    ).toBe(
      'open'
    );

    expect(
      result.overlayStateAfterOutside
    ).toBe(
      'closed'
    );

    expect(
      result.popupOpenAfterEscape
    ).toBe(
      'false'
    );

    expect(
      result.zIndex
    ).toBeGreaterThan(
      10_000
    );
  }
);


test(
  'popup-manager-traps-modal-focus-and-returns-focus-to-trigger',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            registerPopup
          } = await import('/js/ui/popupManager.js');

          const trigger =
            document.createElement('button');

          trigger.id =
            'modal-trigger';

          trigger.textContent =
            'Open modal';

          document.body.appendChild(
            trigger
          );

          const popup =
            document.createElement('div');

          popup.className =
            'ui-panel hidden';

          popup.style.position =
            'fixed';

          popup.style.width =
            '260px';

          popup.style.height =
            '140px';

          popup.innerHTML = `
            <button id="modal-first" type="button">First</button>
            <button id="modal-last" type="button">Last</button>
          `;

          document.body.appendChild(
            popup
          );

          trigger.focus();

          const controller =
            registerPopup({
              popup,
              anchors: [trigger],
              key: 'test-modal-focus',
              modal: true
            });

          controller.openAtPoint(
            100,
            100,
            {
              fallbackWidth: 260,
              fallbackHeight: 140
            }
          );

          const activeAfterOpen =
            document.activeElement.id;

          const first =
            popup.querySelector(
              '#modal-first'
            );

          const last =
            popup.querySelector(
              '#modal-last'
            );

          last.focus();

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'Tab',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterForwardWrap =
            document.activeElement.id;

          first.focus();

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'Tab',
                shiftKey: true,
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterBackwardWrap =
            document.activeElement.id;

          controller.close();

          const activeAfterClose =
            document.activeElement.id;

          return {
            overlayKind:
              popup.dataset.overlayKind,
            overlayModal:
              popup.dataset.overlayModal,
            overlayStateAfterClose:
              popup.dataset.overlayState,
            role:
              popup.getAttribute('role'),
            ariaModal:
              popup.getAttribute('aria-modal'),
            activeAfterOpen,
            activeAfterForwardWrap,
            activeAfterBackwardWrap,
            activeAfterClose
          };
        }
      );

    expect(
      result
    ).toEqual({
      overlayKind: 'dialog',
      overlayModal: 'true',
      overlayStateAfterClose: 'closed',
      role: 'dialog',
      ariaModal: 'true',
      activeAfterOpen: 'modal-first',
      activeAfterForwardWrap: 'modal-first',
      activeAfterBackwardWrap: 'modal-last',
      activeAfterClose: 'modal-trigger'
    });
  }
);


test(
  'popup-manager-handles-menu-keyboard-lifecycle',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            registerPopup
          } = await import('/js/ui/popupManager.js');

          const trigger =
            document.createElement('button');

          trigger.id =
            'menu-trigger';

          trigger.textContent =
            'Open menu';

          document.body.appendChild(
            trigger
          );

          const popup =
            document.createElement('div');

          popup.className =
            'ui-panel hidden';

          popup.style.position =
            'fixed';

          popup.style.width =
            '220px';

          popup.innerHTML = `
            <input id="menu-filter" type="search" value="" />
            <button id="menu-first" type="button">First</button>
            <button id="menu-disabled" type="button" disabled>Disabled</button>
            <button id="menu-last" type="button">Last</button>
          `;

          document.body.appendChild(
            popup
          );

          popup.querySelector(
            '#menu-first'
          ).addEventListener(
            'click',
            () => {

              popup.dataset.clicked =
                'first';
            }
          );

          trigger.focus();

          const controller =
            registerPopup({
              popup,
              close: () => popup.classList.add('hidden'),
              anchors: [trigger],
              key: 'test-menu-keyboard',
              kind: 'context-menu'
            });

          controller.openAtPoint(
            80,
            80,
            {
              fallbackWidth: 220,
              fallbackHeight: 160
            }
          );

          const activeAfterOpen =
            document.activeElement.id;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'ArrowDown',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterArrowDown =
            document.activeElement.id;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'ArrowDown',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterWrap =
            document.activeElement.id;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'ArrowUp',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterArrowUp =
            document.activeElement.id;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'Home',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterHome =
            document.activeElement.id;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'End',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterEnd =
            document.activeElement.id;

          popup.querySelector(
            '#menu-filter'
          ).focus();

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'ArrowDown',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const activeAfterInputArrow =
            document.activeElement.id;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'Enter',
                bubbles: true,
                cancelable: true
              }
            )
          );

          const clickedAfterEnter =
            popup.dataset.clicked;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'Escape',
                bubbles: true,
                cancelable: true
              }
            )
          );

          return {
            overlayKind:
              popup.dataset.overlayKind,
            overlayModal:
              popup.dataset.overlayModal,
            overlayStateAfterEscape:
              popup.dataset.overlayState,
            role:
              popup.getAttribute('role'),
            ariaOrientation:
              popup.getAttribute('aria-orientation'),
            firstRole:
              popup.querySelector('#menu-first').getAttribute('role'),
            lastRole:
              popup.querySelector('#menu-last').getAttribute('role'),
            disabledAria:
              popup.querySelector('#menu-disabled').getAttribute('aria-disabled'),
            disabledTabIndex:
              popup.querySelector('#menu-disabled').tabIndex,
            activeAfterOpen,
            activeAfterArrowDown,
            activeAfterWrap,
            activeAfterArrowUp,
            activeAfterHome,
            activeAfterEnd,
            activeAfterInputArrow,
            clickedAfterEnter,
            activeAfterEscape:
              document.activeElement.id
          };
        }
      );

    expect(
      result
    ).toEqual({
      overlayKind: 'context-menu',
      overlayModal: 'false',
      overlayStateAfterEscape: 'closed',
      role: 'menu',
      ariaOrientation: 'vertical',
      firstRole: 'menuitem',
      lastRole: 'menuitem',
      disabledAria: 'true',
      disabledTabIndex: -1,
      activeAfterOpen: 'menu-first',
      activeAfterArrowDown: 'menu-last',
      activeAfterWrap: 'menu-first',
      activeAfterArrowUp: 'menu-last',
      activeAfterHome: 'menu-first',
      activeAfterEnd: 'menu-last',
      activeAfterInputArrow: 'menu-first',
      clickedAfterEnter: 'first',
      activeAfterEscape: 'menu-trigger'
    });
  }
);


test(
  'popup-manager-allows-dragging-popup-by-free-space-only',
  async ({ page }) => {

    await page.setViewportSize({
      width: 800,
      height: 560
    });

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            registerPopup
          } = await import('/js/ui/popupManager.js');

          const popup =
            document.createElement('div');

          popup.className =
            'ui-panel hidden';

          popup.style.position =
            'fixed';

          popup.style.width =
            '260px';

          popup.style.height =
            '180px';

          popup.innerHTML = `
            <div class="popup-test-title">Свободное место</div>
            <button class="popup-test-button" type="button">Кнопка</button>
          `;

          document.body.appendChild(
            popup
          );

          const controller =
            registerPopup({
              popup,
              key: 'test-popup-drag'
            });

          controller.openAtPoint(
            100,
            100,
            {
              fallbackWidth: 260,
              fallbackHeight: 180
            }
          );

          const before =
            popup.getBoundingClientRect();

          popup.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                button: 0,
                pointerId: 1,
                clientX: before.left + 20,
                clientY: before.top + 20
              }
            )
          );

          document.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                pointerId: 1,
                clientX: before.left + 120,
                clientY: before.top + 70
              }
            )
          );

          document.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 1
              }
            )
          );

          const afterFreeDrag =
            popup.getBoundingClientRect();

          const button =
            popup.querySelector('.popup-test-button');

          const buttonRect =
            button.getBoundingClientRect();

          button.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                button: 0,
                pointerId: 2,
                clientX: buttonRect.left + 4,
                clientY: buttonRect.top + 4
              }
            )
          );

          document.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                pointerId: 2,
                clientX: buttonRect.left + 140,
                clientY: buttonRect.top + 90
              }
            )
          );

          document.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 2
              }
            )
          );

          const afterButtonDrag =
            popup.getBoundingClientRect();

          return {
            movedByFreeSpace:
              afterFreeDrag.left > before.left + 80 &&
              afterFreeDrag.top > before.top + 30,
            ignoredButtonDrag:
              Math.round(afterButtonDrag.left) === Math.round(afterFreeDrag.left) &&
              Math.round(afterButtonDrag.top) === Math.round(afterFreeDrag.top),
            dragReady:
              popup.dataset.popupDragReady
          };
        }
      );

    expect(
      result
    ).toEqual({
      movedByFreeSpace: true,
      ignoredButtonDrag: true,
      dragReady: 'true'
    });
  }
);


test(
  'popup-triggers-toggle-create-menu-tools-and-campaign-map-popup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setWorkspaceHandle
        } = await import('/js/stateActions.js');

        const {
          renderTree
        } = await import('/js/tree/tree.js');

        setWorkspaceHandle({
          name:
            'Test workspace'
        });

        renderTree();
      }
    );

    await page.locator('[data-create-page]').click();

    await expect(
      page.locator('#createMenu')
    ).toBeVisible();

    await expect(
      page.locator('#createMenu .create-option')
    ).toHaveCount(
      6
    );

    await expect(
      page.locator('#createMenu [data-template]')
    ).toHaveCount(
      5
    );

    await expect(
      page.locator('#createMenu .create-option').last()
    ).toContainText(
      'Из шаблона'
    );

    await expect(
      page.locator('#createMenu')
    ).toHaveAttribute(
      'data-overlay-kind',
      'dropdown-menu'
    );

    await expect(
      page.locator('#createMenu')
    ).toHaveAttribute(
      'role',
      'menu'
    );

    await expect(
      page.locator('#createMenu .create-option').first()
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowDown'
    );

    await expect(
      page.locator('#createMenu .create-option').nth(1)
    ).toBeFocused();

    await page.keyboard.press(
      'Home'
    );

    await expect(
      page.locator('#createMenu .create-option').first()
    ).toBeFocused();

    await page.locator('[data-create-page]').click();

    await expect(
      page.locator('#createMenu')
    ).toBeHidden();

    await page.locator('#appToolsBtn').click();

    await expect(
      page.locator('#appToolsPopup')
    ).toBeVisible();

    await page.locator('#appToolsBtn').click();

    await expect(
      page.locator('#appToolsPopup')
    ).toBeHidden();

    const mapResult =
      await page.evaluate(
        async () => {

          const {
            getMapPopup,
            showMapPopup,
            toggleMapPopupForAnchor
          } = await import('/js/editor/campaignMapPopupController.js');

          const anchor =
            document.createElement('button');

          anchor.className =
            'campaign-fog-btn';

          anchor.textContent =
            'Туман';

          document.body.appendChild(
            anchor
          );

          const controls =
            document.createElement('div');

          controls.className =
            'campaign-map-controls';

          controls.appendChild(
            anchor
          );

          document.body.appendChild(
            controls
          );

          const popup =
            getMapPopup();

          popup.textContent =
            'popup';

          anchor.focus();

          showMapPopup(
            popup,
            anchor,
            'fog'
          );

          await new Promise(resolve => requestAnimationFrame(resolve));

          const opened =
            !popup.classList.contains('hidden');

          const openSnapshot = {
            kind:
              popup.dataset.overlayKind,
            modal:
              popup.dataset.overlayModal,
            state:
              popup.dataset.overlayState,
            popupOpen:
              popup.dataset.popupOpen,
            role:
              popup.getAttribute('role'),
            ariaModal:
              popup.getAttribute('aria-modal'),
            ariaLabel:
              popup.getAttribute('aria-label'),
            focusInside:
              document.activeElement === popup ||
              popup.contains(document.activeElement)
          };

          const toggled =
            toggleMapPopupForAnchor(
              anchor,
              'fog'
            );

          const closed =
            popup.classList.contains('hidden');

          const closedSnapshot = {
            state:
              popup.dataset.overlayState,
            popupOpen:
              popup.dataset.popupOpen,
            focusReturned:
              document.activeElement === anchor
          };

          return {
            opened,
            toggled,
            closed,
            openSnapshot,
            closedSnapshot
          };
        }
      );

    expect(
      mapResult
    ).toEqual({
      opened: true,
      toggled: true,
      closed: true,
      openSnapshot: {
        kind: 'dialog',
        modal: 'true',
        state: 'open',
        popupOpen: 'true',
        role: 'dialog',
        ariaModal: 'true',
        ariaLabel: 'Настройки карты',
        focusInside: true
      },
      closedSnapshot: {
        state: 'closed',
        popupOpen: 'false',
        focusReturned: true
      }
    });
  }
);


test(
  'remaining-feature-overlays-use-shared-popup-manager-lifecycle',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const featureOverlayResult =
      await page.evaluate(
        async () => {

          const waitFrame =
            () => new Promise(resolve =>
              requestAnimationFrame(resolve)
            );

          const {
            openTokenPopup
          } = await import('/js/editor/campaignMapTokenPopupController.js');

          const token =
            document.createElement('button');

          token.type =
            'button';

          token.className =
            'campaign-map-token';

          token.dataset.tokenType =
            'object';

          token.dataset.presentationHidden =
            'false';

          token.dataset.name =
            'Token';

          token.style.position =
            'fixed';

          token.style.left =
            '120px';

          token.style.top =
            '120px';

          token.style.width =
            '40px';

          token.style.height =
            '40px';

          document.body.appendChild(
            token
          );

          openTokenPopup(
            token,
            {
              hasActiveTokenInteraction:
                () => false,
              hasActiveShapeInteraction:
                () => false,
              getTokenActionDeps:
                () => ({})
            }
          );

          await waitFrame();

          const tokenPopup =
            document.getElementById(
              'campaignTokenPopup'
            );

          const tokenOpen = {
            visible:
              !tokenPopup.classList.contains('hidden'),
            kind:
              tokenPopup.dataset.overlayKind,
            modal:
              tokenPopup.dataset.overlayModal,
            state:
              tokenPopup.dataset.overlayState,
            lifecycle:
              tokenPopup.dataset.overlayLifecycle,
            label:
              tokenPopup.getAttribute('aria-label')
          };

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key:
                  'Escape',
                bubbles:
                  true,
                cancelable:
                  true
              }
            )
          );

          await waitFrame();

          const tokenClosed = {
            hidden:
              tokenPopup.classList.contains('hidden'),
            state:
              tokenPopup.dataset.overlayState,
            popupOpen:
              tokenPopup.dataset.popupOpen
          };

          const {
            setupItemSets
          } = await import('/js/ui/itemSets.js');

          const {
            state
          } = await import('/js/state.js');

          setupItemSets();

          state.pages = [
            {
              id:
                'sword',
              title:
                'Sword',
              type:
                'item',
              tags:
                [],
              content:
                ''
            }
          ];

          const block =
            document.createElement('div');

          block.className =
            'template-block item-set-block';

          block.innerHTML = `
            <div class="item-set-list"></div>
            <button class="item-set-add-btn" type="button">Add item</button>
          `;

          document.body.appendChild(
            block
          );

          const itemButton =
            block.querySelector(
              '.item-set-add-btn'
            );

          itemButton.focus();

          itemButton.dispatchEvent(
            new MouseEvent(
              'click',
              {
                bubbles:
                  true,
                cancelable:
                  true
              }
            )
          );

          await waitFrame();

          const picker =
            document.getElementById(
              'itemSetPicker'
            );

          const pickerOpen = {
            visible:
              !picker.classList.contains('hidden'),
            kind:
              picker.dataset.overlayKind,
            modal:
              picker.dataset.overlayModal,
            state:
              picker.dataset.overlayState,
            lifecycle:
              picker.dataset.overlayLifecycle,
            role:
              picker.getAttribute('role'),
            ariaModal:
              picker.getAttribute('aria-modal'),
            label:
              picker.getAttribute('aria-label')
          };

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key:
                  'Escape',
                bubbles:
                  true,
                cancelable:
                  true
              }
            )
          );

          await waitFrame();

          const pickerClosed = {
            hidden:
              picker.classList.contains('hidden'),
            state:
              picker.dataset.overlayState,
            popupOpen:
              picker.dataset.popupOpen
          };

          return {
            tokenOpen,
            tokenClosed,
            pickerOpen,
            pickerClosed
          };
        }
      );

    expect(
      featureOverlayResult
    ).toEqual({
      tokenOpen: {
        visible: true,
        kind: 'popover',
        modal: 'false',
        state: 'open',
        lifecycle: 'popup-manager',
        label: 'Действия токена карты'
      },
      tokenClosed: {
        hidden: true,
        state: 'closed',
        popupOpen: 'false'
      },
      pickerOpen: {
        visible: true,
        kind: 'popover',
        modal: 'false',
        state: 'open',
        lifecycle: 'popup-manager',
        role: 'dialog',
        ariaModal: 'false',
        label: 'Выбор элемента набора'
      },
      pickerClosed: {
        hidden: true,
        state: 'closed',
        popupOpen: 'false'
      }
    });

    await page.locator('#appToolsBtn').click();

    await page.locator('[data-onboarding-open="quickstart"]').click();

    const onboardingPopup =
      page.locator('#onboardingPopup');

    await expect(
      onboardingPopup
    ).toBeVisible();

    await expect(
      onboardingPopup
    ).toHaveAttribute(
      'data-overlay-kind',
      'dialog'
    );

    await expect(
      onboardingPopup
    ).toHaveAttribute(
      'data-overlay-lifecycle',
      'popup-manager'
    );

    await expect(
      onboardingPopup
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await expect(
      onboardingPopup
    ).toHaveAttribute(
      'aria-modal',
      'false'
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      onboardingPopup
    ).toBeHidden();

    await expect(
      onboardingPopup
    ).toHaveAttribute(
      'data-overlay-state',
      'closed'
    );
  }
);


test(
  'editor-feature-popups-use-shared-overlay-contract',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const waitFrame =
            () => new Promise(resolve =>
              requestAnimationFrame(resolve)
            );

          const snapshotOverlay =
            selector => {

              const popup =
                document.querySelector(selector);

              return {
                kind:
                  popup?.dataset.overlayKind || '',
                modal:
                  popup?.dataset.overlayModal || '',
                state:
                  popup?.dataset.overlayState || '',
                popupOpen:
                  popup?.dataset.popupOpen || '',
                role:
                  popup?.getAttribute('role') || '',
                ariaModal:
                  popup?.getAttribute('aria-modal') || '',
                ariaLabel:
                  popup?.getAttribute('aria-label') || '',
                visible:
                  Boolean(
                    popup &&
                    !popup.classList.contains('hidden')
                  )
              };
            };

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="entity-layout card-shell" contenteditable="false">
              <select class="card-type-select">
                <option value="note" selected>note</option>
              </select>

              <button id="blockPopupAnchor" type="button">add block</button>

              <div
                class="rich-text-field"
                contenteditable="true"
                data-persistent-editable="true"
              >alpha beta gamma</div>

              <section class="card-properties-block" contenteditable="false">
                <h2>Свойства</h2>
                <div class="card-properties-grid">
                  <label class="card-property-field" data-property-id="hp">
                    <span class="card-property-label">HP</span>
                    <input data-property-name="hp" value="12">
                  </label>
                </div>
              </section>

              <div class="image-block" contenteditable="false">
                <div class="image-block-frame">
                  <img
                    data-asset="inline-test"
                    alt=""
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='32'%3E%3Crect width='64' height='32' fill='%23888'/%3E%3C/svg%3E"
                  >
                </div>
                <button class="image-crop-btn" type="button">crop</button>
              </div>
            </div>
          `;

          const {
            setupBlockPopup,
            openTypePicker
          } = await import('/js/editor/blocks/blockPopup.js');

          setupBlockPopup();

          const blockAnchor =
            document.querySelector('#blockPopupAnchor');

          blockAnchor.focus();

          openTypePicker(
            blockAnchor,
            async () => {}
          );

          await waitFrame();

          const blockOpen =
            snapshotOverlay('#blockPopup');

          document
            .querySelector('#blockPopup .block-popup-cancel')
            ?.click();

          await waitFrame();

          const blockClosed =
            snapshotOverlay('#blockPopup');

          const {
            setupLinks,
            createLinkFromSelection
          } = await import('/js/editor/links.js');

          setupLinks(
            editor
          );

          const textField =
            editor.querySelector('.rich-text-field');

          const textNode =
            textField.firstChild;

          const selection =
            window.getSelection();

          const linkRange =
            document.createRange();

          linkRange.setStart(
            textNode,
            0
          );

          linkRange.setEnd(
            textNode,
            5
          );

          selection.removeAllRanges();
          selection.addRange(
            linkRange
          );

          createLinkFromSelection();

          await waitFrame();

          const linkOpen =
            snapshotOverlay('#linkPopup');

          document
            .querySelector('#cancelLinkBtn')
            ?.click();

          await waitFrame();

          const linkClosed =
            snapshotOverlay('#linkPopup');

          const {
            ensurePropertySettingsControls
          } = await import('/js/editor/propertiesSettingsPopup.js');

          ensurePropertySettingsControls(
            editor
          );

          const propertyButton =
            editor.querySelector('.card-properties-settings-btn');

          propertyButton.focus();
          propertyButton.click();

          await waitFrame();

          const propertyOpen =
            snapshotOverlay('.property-settings-popup');

          document
            .querySelector('.property-settings-popup .property-settings-close')
            ?.click();

          await waitFrame();

          const propertyClosed =
            snapshotOverlay('.property-settings-popup');

          const {
            setupPortraitUploads
          } = await import('/js/editor/images.js');

          setupPortraitUploads(
            editor
          );

          const cropButton =
            editor.querySelector('.image-crop-btn');

          cropButton.focus();
          cropButton.click();

          await waitFrame();

          const cropOpen =
            snapshotOverlay('.image-crop-popup');

          document
            .querySelector('.image-crop-popup .image-crop-done')
            ?.click();

          await waitFrame();

          const cropClosed =
            snapshotOverlay('.image-crop-popup');

          const colorRange =
            document.createRange();

          colorRange.selectNodeContents(
            textField
          );

          selection.removeAllRanges();
          selection.addRange(
            colorRange
          );

          document.dispatchEvent(
            new Event(
              'selectionchange'
            )
          );

          await waitFrame();

          const colorButton =
            document.querySelector('#toolbarColorButton');

          colorButton.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                button: 0
              }
            )
          );

          await waitFrame();

          const colorOpen =
            snapshotOverlay('#toolbarColorPopup');

          colorButton.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                button: 0
              }
            )
          );

          await waitFrame();

          const colorClosed =
            snapshotOverlay('#toolbarColorPopup');

          return {
            blockOpen,
            blockClosed,
            linkOpen,
            linkClosed,
            propertyOpen,
            propertyClosed,
            cropOpen,
            cropClosed,
            colorOpen,
            colorClosed
          };
        }
      );

    expect(
      result.blockOpen
    ).toMatchObject({
      kind: 'dialog',
      modal: 'true',
      state: 'open',
      popupOpen: 'true',
      role: 'dialog',
      ariaModal: 'true',
      visible: true
    });

    expect(
      result.blockClosed
    ).toMatchObject({
      state: 'closed',
      popupOpen: 'false',
      visible: false
    });

    expect(
      result.linkOpen
    ).toMatchObject({
      kind: 'dialog',
      modal: 'true',
      state: 'open',
      role: 'dialog',
      ariaModal: 'true',
      ariaLabel: 'Создание ссылки',
      visible: true
    });

    expect(
      result.linkClosed
    ).toMatchObject({
      state: 'closed',
      popupOpen: 'false',
      visible: false
    });

    expect(
      result.propertyOpen
    ).toMatchObject({
      kind: 'dialog',
      modal: 'true',
      state: 'open',
      role: 'dialog',
      ariaModal: 'true',
      ariaLabel: 'Настройки свойств',
      visible: true
    });

    expect(
      result.propertyClosed
    ).toMatchObject({
      state: 'closed',
      popupOpen: 'false',
      visible: false
    });

    expect(
      result.cropOpen
    ).toMatchObject({
      kind: 'dialog',
      modal: 'true',
      state: 'open',
      role: 'dialog',
      ariaModal: 'true',
      ariaLabel: 'Кадрирование изображения',
      visible: true
    });

    expect(
      result.cropClosed
    ).toMatchObject({
      state: 'closed',
      popupOpen: 'false',
      visible: false
    });

    expect(
      result.colorOpen
    ).toMatchObject({
      kind: 'popover',
      modal: 'false',
      state: 'open',
      popupOpen: 'true',
      ariaLabel: 'Цвет текста',
      visible: true
    });

    expect(
      result.colorClosed
    ).toMatchObject({
      state: 'closed',
      popupOpen: 'false',
      visible: false
    });
  }
);
