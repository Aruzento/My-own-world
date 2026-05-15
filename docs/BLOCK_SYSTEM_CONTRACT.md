# Block System Contract

Этот документ фиксирует правила для всех блоков редактора. Его цель: отделить HTML, который хранится в `.md`, от элементов интерфейса, которые нужны только во время работы приложения.

## Persistent HTML

Persistent HTML сохраняется в тело страницы и должен быть достаточным, чтобы восстановить блок после повторного открытия.

Каждый блок обязан иметь:

```html
<div
  class="template-block"
  data-block-type="text"
  data-block-version="1"
  contenteditable="false"
>
</div>
```

Правила:

- `data-block-type` задаёт тип блока и связывает его с поведением.
- `data-block-version` задаёт версию конкретного блока, а не всей страницы.
- Редактируемые области явно получают `contenteditable="true"`.
- Нередактируемый каркас блока получает `contenteditable="false"`.
- Persistent HTML не должен содержать кнопки управления, drag handles, popup-элементы и временные списки.

## Runtime Controls

Runtime controls создаются приложением при открытии страницы или рендере блока. Они не сохраняются в `.md`.

Любой runtime-элемент обязан иметь:

```html
data-runtime="true"
contenteditable="false"
```

Сейчас runtime-слой включает:

- панель добавления блоков;
- кнопки блока: перенос, переименование, удаление;
- кнопки строк таблицы;
- кнопку добавления предмета в item set;
- кнопку удаления предмета из item set;
- кастомный dropdown типа карты;
- backlinks и другие информационные панели интерфейса.

## Save Serialization

Сохранение идёт через `serializePersistentEditorHTML()` из `js/editor/blocks/blockContract.js`.

Serializer обязан:

- скопировать значения `input`, `textarea`, `select` в clone;
- пропустить поля внутри runtime controls;
- удалить все элементы с `data-runtime="true"`;
- удалить legacy runtime selectors, если они встретились в старых страницах;
- очистить runtime-зеркала тегов и aliases;
- удалить runtime `src` у `img[data-asset]`, оставив стабильный `data-asset`.

Новый form control должен быть либо persistent и корректно сериализоваться, либо runtime и иметь `data-runtime="true"`.

## Block Upgrades

Миграции должны быть точечными: только для конкретного типа блока и только при необходимости.

Пример:

```js
if (type === 'dndStats' && currentVersion < 2) {
  upgradeDndStatsToV2(block);
}
```

Нельзя возвращать глобальную миграцию всей страницы ради одного блока. Если меняется структура блока, повышается только `data-block-version` этого блока.

## New Block Checklist

Для нового типа блока нужно добавить:

- generator persistent HTML в `js/templates/blockTypes.js` или отдельном generator-файле;
- `data-block-type` и `data-block-version`;
- creator в `js/editor/blocks/blockFactory.js`;
- поведение в отдельном UI-модуле, если оно нужно;
- CSS в отдельном файле или тематическом CSS;
- runtime controls через `markRuntime()`;
- upgrade-функцию в `blockContract.js`, если структура может меняться;
- ручной smoke-тест: создать, заполнить, сохранить, открыть заново.
