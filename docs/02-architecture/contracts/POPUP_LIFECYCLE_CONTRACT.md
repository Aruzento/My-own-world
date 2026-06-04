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
   - при необходимости `modal`.

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

Остается как будущий hardening:

- постепенно переносить оставшиеся static popup containers из `index.html`, если это безопасно;
- расширить tests на каждый конкретный popup-тип;
- привести item picker и старые specialized popup к controller API вместо прямого позиционирования.
