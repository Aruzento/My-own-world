import {
  expect,
  test
} from '@playwright/test';


const VIEWPORT_PADDING =
  12;

const POSITION_TOLERANCE =
  2;


async function installPopupFixture(
  page,
  {
    id,
    style = {},
    className = 'popup-drag-fixture hidden',
    contentStyle = null,
    css = ''
  }
) {

  await page.evaluate(
    async ({
      id,
      style,
      className,
      contentStyle,
      css
    }) => {

      const {
        registerPopup
      } = await import('/js/ui/popupManager.js');

      document
        .getElementById(id)
        ?.remove();

      document
        .getElementById(`${id}-style`)
        ?.remove();

      if (css) {

        const styleElement =
          document.createElement('style');

        styleElement.id =
          `${id}-style`;

        styleElement.textContent =
          css;

        document.head.appendChild(
          styleElement
        );
      }

      const popup =
        document.createElement('div');

      popup.id =
        id;

      popup.className =
        className;

      popup.textContent =
        'Drag surface';

      Object.assign(
        popup.style,
        {
          background:
            'rgba(16, 18, 17, 0.98)',
          border:
            '1px solid rgba(255, 232, 183, 0.24)',
          color:
            '#efe6d2',
          padding:
            '12px'
        },
        style
      );

      if (contentStyle) {

        const content =
          document.createElement('div');

        content.textContent =
          'Sized fixture content';

        Object.assign(
          content.style,
          contentStyle
        );

        popup.replaceChildren(
          content
        );
      }

      document.body.appendChild(
        popup
      );

      const controller =
        registerPopup({
          popup,
          close:
            () => popup.classList.add('hidden'),
          key:
            id
        });

      controller.open();
    },
    {
      id,
      style,
      className,
      contentStyle,
      css
    }
  );
}


async function getRect(
  page,
  selector
) {

  return page.locator(selector).evaluate(element => {

    const rect =
      element.getBoundingClientRect();

    return {
      left:
        rect.left,
      top:
        rect.top,
      right:
        rect.right,
      bottom:
        rect.bottom,
      width:
        rect.width,
      height:
        rect.height
    };
  });
}


async function dragPopup(
  page,
  selector,
  {
    startRatioX = 0.25,
    startOffsetY = 20,
    deltaX = 120,
    deltaY = 80,
    release = true
  } = {}
) {

  const before =
    await getRect(
      page,
      selector
    );

  const start = {
    x:
      before.left + before.width * startRatioX,
    y:
      before.top + startOffsetY
  };

  const grab = {
    x:
      start.x - before.left,
    y:
      start.y - before.top
  };

  const end = {
    x:
      start.x + deltaX,
    y:
      start.y + deltaY
  };

  await page.mouse.move(
    start.x,
    start.y
  );

  await page.mouse.down();

  await page.mouse.move(
    end.x,
    end.y,
    {
      steps:
        4
    }
  );

  const after =
    await getRect(
      page,
      selector
    );

  if (release) {

    await page.mouse.up();
  }

  return {
    before,
    after,
    start,
    end,
    grab
  };
}


function expectCloseTo(
  actual,
  expected,
  tolerance = POSITION_TOLERANCE
) {

  expect(
    Math.abs(actual - expected)
  ).toBeLessThanOrEqual(
    tolerance
  );
}


function expectGrabInvariant(
  drag
) {

  expectCloseTo(
    drag.end.x - drag.after.left,
    drag.grab.x
  );

  expectCloseTo(
    drag.end.y - drag.after.top,
    drag.grab.y
  );
}


test(
  'popup drag preserves fixed popup delta and grab point',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        900,
      height:
        640
    });

    await page.goto(
      '/'
    );

    await installPopupFixture(
      page,
      {
        id:
          'fixed-drag-popup',
        style: {
          position:
            'fixed',
          left:
            '128px',
          top:
            '96px',
          width:
            '320px',
          height:
            '180px'
        }
      }
    );

    const zIndexBefore =
      await page.locator('#fixed-drag-popup').evaluate(element =>
        Number(
          element.style.zIndex
        ) || 0
      );

    const drag =
      await dragPopup(
        page,
        '#fixed-drag-popup',
        {
          startRatioX:
            0.25,
          startOffsetY:
            20,
          deltaX:
            120,
          deltaY:
            80
        }
      );

    expectCloseTo(
      drag.after.left,
      drag.before.left + 120
    );

    expectCloseTo(
      drag.after.top,
      drag.before.top + 80
    );

    expectGrabInvariant(
      drag
    );

    const zIndexAfter =
      await page.locator('#fixed-drag-popup').evaluate(element =>
        Number(
          element.style.zIndex
        ) || 0
      );

    expect(
      zIndexAfter
    ).toBeGreaterThan(
      zIndexBefore
    );
  }
);


test(
  'command palette drag keeps centered transform popup under pointer',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        900,
      height:
        640
    });

    await page.goto(
      '/'
    );

    await page.keyboard.press(
      'Control+K'
    );

    const palette =
      page.locator('#commandPalette');

    await expect(
      palette
    ).toBeVisible();

    await page.waitForTimeout(
      260
    );

    const cssStateBefore =
      await palette.evaluate(element => {

        const style =
          getComputedStyle(
            element
          );

        return {
          left:
            style.left,
          transform:
            style.transform
        };
      });

    expect(
      cssStateBefore.transform
    ).not.toBe(
      'none'
    );

    const before =
      await getRect(
        page,
        '#commandPalette'
      );

    const grab = {
      x:
        42,
      y:
        78
    };

    const start = {
      x:
        before.left + grab.x,
      y:
        before.top + grab.y
    };

    const dragDelta = {
      x:
        48,
      y:
        72
    };

    await page.mouse.move(
      start.x,
      start.y
    );

    await page.mouse.down();

    await page.mouse.move(
      start.x + 1,
      start.y + 1
    );

    const afterFirstMove =
      await getRect(
        page,
        '#commandPalette'
      );

    expectCloseTo(
      afterFirstMove.left,
      before.left + 1
    );

    expectCloseTo(
      afterFirstMove.top,
      before.top + 1
    );

    await page.mouse.move(
      start.x + dragDelta.x,
      start.y + dragDelta.y,
      {
        steps:
          4
      }
    );

    const afterDrag =
      await getRect(
        page,
        '#commandPalette'
      );

    expectCloseTo(
      start.x + dragDelta.x - afterDrag.left,
      grab.x
    );

    expectCloseTo(
      start.y + dragDelta.y - afterDrag.top,
      grab.y
    );

    await page.mouse.up();

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      palette
    ).toBeHidden();

    const inlinePositionAfterClose =
      await palette.evaluate(element => ({
        left:
          element.style.left,
        top:
          element.style.top,
        manual:
          element.dataset.popupManualPosition || ''
      }));

    expect(
      inlinePositionAfterClose
    ).toEqual({
      left:
        '',
      top:
        '',
      manual:
        ''
    });
  }
);


test(
  'popup drag freezes opening transform animation after release',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        900,
      height:
        640
    });

    await page.goto(
      '/'
    );

    await installPopupFixture(
      page,
      {
        id:
          'animated-drag-popup',
        style: {
          position:
            'fixed',
          left:
            '160px',
          top:
            '132px',
          width:
            '300px',
          height:
            '160px',
          transformOrigin:
            'top left'
        },
        css: `
          @keyframes popupDragFixtureIntro {
            from {
              transform: translateY(-42px) scale(0.96);
            }
            to {
              transform: translateY(0) scale(1);
            }
          }

          #animated-drag-popup:not(.hidden) {
            animation: popupDragFixtureIntro 260ms linear;
          }
        `
      }
    );

    const drag =
      await dragPopup(
        page,
        '#animated-drag-popup',
        {
          startRatioX:
            0.3,
          startOffsetY:
            24,
          deltaX:
            100,
          deltaY:
            56
        }
      );

    const afterRelease =
      await getRect(
        page,
        '#animated-drag-popup'
      );

    await page.waitForTimeout(
      340
    );

    const afterAnimationTime =
      await getRect(
        page,
        '#animated-drag-popup'
      );

    expectCloseTo(
      afterAnimationTime.left,
      afterRelease.left
    );

    expectCloseTo(
      afterAnimationTime.top,
      afterRelease.top
    );
  }
);


test(
  'popup drag clamps to viewport without accumulating offset',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        700,
      height:
        460
    });

    await page.goto(
      '/'
    );

    await installPopupFixture(
      page,
      {
        id:
          'clamped-drag-popup',
        style: {
          position:
            'fixed',
          left:
            '80px',
          top:
            '72px',
          width:
            '240px',
          height:
            '130px'
        }
      }
    );

    const before =
      await getRect(
        page,
        '#clamped-drag-popup'
      );

    const start = {
      x:
        before.left + 48,
      y:
        before.top + 26
    };

    await page.mouse.move(
      start.x,
      start.y
    );

    await page.mouse.down();

    await page.mouse.move(
      -100,
      -80
    );

    const clamped =
      await getRect(
        page,
        '#clamped-drag-popup'
      );

    expectCloseTo(
      clamped.left,
      VIEWPORT_PADDING
    );

    expectCloseTo(
      clamped.top,
      VIEWPORT_PADDING
    );

    await page.mouse.move(
      230,
      180,
      {
        steps:
          4
      }
    );

    const returned =
      await getRect(
        page,
        '#clamped-drag-popup'
      );

    expectCloseTo(
      returned.left,
      230 - 48
    );

    expectCloseTo(
      returned.top,
      180 - 26
    );

    await page.mouse.up();
  }
);


test(
  'popup drag normalizes right bottom and inset positioning',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        900,
      height:
        640
    });

    await page.goto(
      '/'
    );

    await installPopupFixture(
      page,
      {
        id:
          'inset-drag-popup',
        style: {
          position:
            'fixed',
          inset:
            'auto 40px 42px auto',
          width:
            'auto',
          height:
            'auto'
        },
        contentStyle: {
          boxSizing:
            'border-box',
          width:
            '260px',
          height:
            '140px',
          padding:
            '12px'
        }
      }
    );

    const drag =
      await dragPopup(
        page,
        '#inset-drag-popup',
        {
          startRatioX:
            0.35,
          startOffsetY:
            24,
          deltaX:
            -120,
          deltaY:
            -90
        }
      );

    expectCloseTo(
      drag.after.width,
      drag.before.width
    );

    expectCloseTo(
      drag.after.height,
      drag.before.height
    );

    expectGrabInvariant(
      drag
    );

    const manualStyle =
      await page.locator('#inset-drag-popup').evaluate(element => ({
        right:
          element.style.right,
        bottom:
          element.style.bottom,
        inset:
          element.style.inset,
        width:
          element.style.width,
        height:
          element.style.height,
        manual:
          element.dataset.popupManualPosition
      }));

    expect(
      manualStyle.right
    ).toBe(
      'auto'
    );

    expect(
      manualStyle.bottom
    ).toBe(
      'auto'
    );

    expect(
      manualStyle.manual
    ).toBe(
      'true'
    );

    expect(
      manualStyle.width
    ).toMatch(
      /px$/
    );

    expect(
      manualStyle.height
    ).toMatch(
      /px$/
    );
  }
);
