---
summary: "architecture document for POPUP_LIFECYCLE_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Popup Lifecycle Contract

Дата создания: 01.06.2026.

Этот контракт описывает единые правила для popup-ов приложения. Цель: popup не должен жить по собственным случайным правилам, выходить за viewport, оставаться открытым после Escape, сохраняться в HTML карточки или ломать повторный клик по кнопке.

## Термины

- **Popup** — временная UI-панель: меню создания, контекстное меню, настройки, popup карты, popup ссылки, preview wiki-link, popup изображения.
- **Anchor** — кнопка или элемент, рядом с которым открывается popup.
- **Runtime UI** — интерфейс, который существует только в приложении и не должен сохраняться в `.md`.
- **Trigger** — элемент, по которому пользователь открывает popup.

## Lifecycle

1. **Create**
   Popup создается либо в JS, либо временно остается в `index.html`, если перенос небезопасен.
   Новый popup должен иметь класс `hidden` по умолчанию.

2. **Register**
   Popup регистрируется через `registerPopup()` из `js/ui/popupManager.js`.
   Регистрация задает:
   - `popup`;
   - `close`;
   - `anchors`;
   - `key`;
   - при необходимости `modal`;
   - `kind` for overlay-specific behavior such as `dropdown-menu` or `context-menu`.

3. **Open**
   Popup открывается через `openPopupNearAnchor()` или `openPopupAtPoint()`.
   Открытие:
   - снимает `hidden`;
   - выставляет `data-popup-open="true"`;
   - поднимает `z-index`;
   - позиционирует popup внутри viewport.

4. **Toggle**
   Повторный клик по trigger должен закрывать popup, если он уже открыт этим trigger.
   Для простых popup используется `togglePopupNearAnchor()` или controller, который возвращает `true/false`.

5. **Close**
   Popup закрывается:
   - по Escape;
   - по клику вне popup и вне anchors;
   - по повторному клику trigger;
   - по явной кнопке закрытия/отмены.

6. **Destroy**
   Динамический popup, который больше не нужен, удаляется через `destroyPopup()`.

## Overlay Attributes And Modal Focus

`0.0.1.8.9` adds the first shared overlay-focus foundation to `popupManager`.

Registered popups must keep these runtime markers synchronized:

- `data-overlay-lifecycle="popup-manager"`;
- `data-overlay-kind="popover"`, `data-overlay-kind="dialog"`, `data-overlay-kind="dropdown-menu"` or `data-overlay-kind="context-menu"`;
- `data-overlay-modal="false"` or `data-overlay-modal="true"`;
- `data-overlay-state="closed"` or `data-overlay-state="open"`;
- `data-popup-open="false"` or `data-popup-open="true"`.

For registered modal popups:

- `registerPopup({ modal: true })` makes the popup a dialog overlay by default;
- the manager adds `role="dialog"`, `aria-modal="true"` and a focusable container fallback when the popup does not already define them;
- opening the modal moves focus to `[data-overlay-autofocus="true"]`, `[autofocus]`, the first focusable child or the popup container;
- Tab and Shift+Tab stay inside the topmost open modal popup;
- closing the modal returns focus to the element that opened it, or to a connected anchor when possible.

For registered menu-like popups:

- `registerPopup({ kind: 'dropdown-menu' })` and `registerPopup({ kind: 'context-menu' })` opt into shared menu behavior;
- the manager adds menu defaults (`role="menu"`, `aria-orientation="vertical"`) when the popup does not already define them;
- visible command buttons/links receive `role="menuitem"` and disabled items are skipped by keyboard navigation;
- opening a closed menu moves focus to the first enabled menu item;
- ArrowDown/ArrowUp wrap through enabled menu items, Home/End jump to the first/last enabled item, and Enter/Space activates the focused item;
- fields inside a menu keep normal text entry behavior, while ArrowDown/ArrowUp can move from the field into the command list;
- closing a menu returns focus to the opener/anchor when possible.

For the first tooltip/toast foundation:

- icon-only shell controls can expose a shared CSS tooltip through `data-tooltip` while keeping `title` and `aria-label` as native/accessibility fallbacks;
- tooltip styling must use shared overlay tokens and must not add a new controller for static labels;
- operation progress is the first toast-like surface and exposes `data-overlay-kind="toast"`, `data-overlay-state` and `data-toast-state`;
- toast/progress styling must use `--mow-z-toast` and shared overlay surface/elevation tokens.

This is a foundation step. Broader feature-specific popup styling and overlay adoption remain part of the active overlay migration.

For the first editor feature overlay adoption:

- `blockPopup`, `linkPopup`, `property-settings-popup` and `image-crop-popup` register as dialog overlays through `popupManager`;
- `toolbarColorPopup` registers as a non-modal popover overlay;
- direct close buttons must route through the popup controller or an equivalent manager close path so `data-overlay-state` and `data-popup-open` remain synchronized;
- feature-specific CSS may remain temporarily, but it must not create a parallel overlay lifecycle.

For the first campaign map generic popup adoption:

- `campaignMapPopupController` registers `#campaignMapPopup` as a modal dialog overlay through `popupManager`;
- add/fog/drawing/grid/layers/music/initiative-style map popups that share this container must close through `closeMapPopup()` or the controller close path so overlay state and focus return stay synchronized;
- the shared map popup base should use overlay/control tokens for surface, radius, spacing, buttons, inputs and focus states;
- `campaignMapTokenPopupController` registers `#campaignTokenPopup` as a non-modal popover overlay through `popupManager`; delayed hover behavior remains local, but open/close state, Escape and outside close belong to the shared lifecycle.

For the closing `0.0.1.8.9` overlay adoption:

- `itemSetPicker` registers as a non-modal popover overlay with shared state and ARIA metadata;
- `onboardingPopup` registers as a non-modal dialog overlay and uses the static controller `open()` path so its fixed panel placement is preserved;
- Knowledge Graph node actions register as a non-modal popover because the node surface mixes commands with relationship edit fields;
- Knowledge Graph connect details register as a non-modal dialog overlay and close stale DOM state before rerendering the graph runtime.

## Position

Все popup должны использовать `popupPosition.js` через `popupManager.js`.

Правила:

- `left/top` всегда зажимаются в viewport;
- `max-width` и `max-height` ограничены видимой областью;
- если снизу не хватает места, popup пробует открыться сверху;
- старый параметр `offset` поддерживается как alias для `gap`.

## Runtime И Save

Popup относится к runtime UI.

Правила:

- popup нельзя сохранять в HTML карточки;
- динамические popup должны получать runtime-маркер там, где это нужно sanitizer/serializer;
- новые popup не должны жить внутри persistent content, если их можно держать в `document.body`.

## Текущий Статус Перевода

Переведено на общий lifecycle:

- app settings/tools popup;
- create menu;
- tree context menu;
- link popup;
- block popup;
- wiki preview popup;
- image crop popup;
- confirm popup;
- campaign map popup.

Current `0.0.1.8.9` foundation status:

- `popupManager` synchronizes shared `data-overlay-*` attributes for registered popups;
- modal focus trap and focus return are browser-tested in `tests/browser/popup-lifecycle.spec.mjs`;
- dropdown/context-menu keyboard lifecycle is browser-tested in `tests/browser/popup-lifecycle.spec.mjs`;
- create menu, tree context menu and wiki create menu now use explicit overlay kinds;
- first shell tooltips and operation-progress toast markers are browser-tested in `tests/browser/app-shell.spec.mjs`;
- first editor feature overlays (`blockPopup`, `linkPopup`, `property-settings-popup`, `image-crop-popup`, `toolbarColorPopup`) are browser-tested in `tests/browser/popup-lifecycle.spec.mjs`;
- generic campaign map popups through `campaignMapPopupController` are modal dialog overlays with tokenized base popup/control styling and focused browser coverage;
- campaign map token hover/actions popups, item-set picker and onboarding help popup are covered in `tests/browser/popup-lifecycle.spec.mjs`;
- Knowledge Graph node/connect overlays are covered in `tests/browser/knowledge-graph.spec.mjs`;
- existing feature popup CSS remains compatibility styling until its owning migration phase updates it.

Остается как будущий hardening:

- постепенно переносить оставшиеся static popup containers из `index.html`, если это безопасно;
- расширить tests на каждый конкретный popup-тип;
- привести item picker и старые specialized popup к controller API вместо прямого позиционирования.
