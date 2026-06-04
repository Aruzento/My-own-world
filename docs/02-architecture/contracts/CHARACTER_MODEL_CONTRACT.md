---
summary: "Contract for CharacterModel, the model-first character and creature domain layer."
read_when:
  - "Before changing character, creature, HP, skills, initiative, or inventory logic"
  - "Before reading character data from card HTML"
owner_zone: "architecture"
---

# Character Model Contract

Дата обновления: 04.06.2026

## Назначение

`CharacterModel` - это доменная модель персонажа или существа. Она нужна, чтобы карта, свойства карточек, будущий инвентарь, эффекты, инициатива и проверки читали игровые данные из одного API, а не из произвольного HTML.

Модель не заменяет карточку. Карточка остается пользовательским документом. `CharacterModel` является расчетным слоем поверх:

1. `PropertiesModel` из блока `Свойства`;
2. legacy блока `Стат. блок DnD`;
3. будущих источников правил, рас, классов, эффектов и world packages.

## Файлы

- `js/character/characterModel.js` - нормализация модели, DnD-расчеты, HP/temp HP/death state.
- `js/properties/characterCalculations.js` - совместимый фасад старого кода, который теперь должен опираться на `CharacterModel`.
- `js/properties/propertiesModel.js` - чтение блока `Свойства`.
- `js/properties/propertySchemas.js` - стабильные ключи полей свойств.
- `js/editor/campaignMapHealth.js` - карта пока вызывает старый фасад, но получает данные уже через модельный слой.

## Public API

Минимальный foundation API:

```js
createCharacterModel(options)
createCharacterModelFromSources({ page, propertiesModels, legacyDndHealth })
readCharacterModelFromPage(page)
getCharacterHealth(model)
applyCharacterHealthChange(model, options)
calculateAbilityModifier(score)
calculateProficiencyBonus(level)
calculateDndCheckValue(options)
```

## Структура Модели

```js
{
  kind: 'CharacterModel',
  version: 1,
  pageId: '...',
  cardType: 'character' | 'creature',
  source: 'properties' | 'legacy-dnd' | 'empty',
  level: 1,
  proficiencyBonus: 2,
  armorClass: 10,
  speed: 30,
  abilities: {
    str: { score: 10, modifier: 0 },
    dex: { score: 10, modifier: 0 },
    con: { score: 10, modifier: 0 },
    int: { score: 10, modifier: 0 },
    wis: { score: 10, modifier: 0 },
    cha: { score: 10, modifier: 0 }
  },
  health: {
    current: 10,
    max: 10,
    temp: 0,
    percent: 1,
    isDown: false
  },
  deathSaves: {
    successes: 0,
    failures: 0,
    isDead: false
  },
  sources: {
    properties: true,
    legacyDnd: false
  }
}
```

## Правила Источников

1. `PropertiesModel` имеет приоритет над legacy HTML.
2. Если `PropertiesModel` есть, но в нем нет части полей, недостающие значения получают безопасные defaults.
3. Если `PropertiesModel` нет, `CharacterModel` может быть построен из legacy `Стат. блок DnD`.
4. Если нет ни одного источника, создается пустая модель с безопасными defaults, но она не должна сама записывать карточку.
5. Карта не должна читать HP напрямую из HTML, если может обратиться к `getPageCharacterHealth()` / `CharacterModel`.

## DnD 5e Расчеты

Модификатор характеристики считается по правилу `floor((score - 10) / 2)` с ограничением значения от 1 до 30.

Бонус мастерства:

- уровень 1-4 = +2
- уровень 5-8 = +3
- уровень 9-12 = +4
- уровень 13-16 = +5
- уровень 17-20 = +6

## HP / Temp HP / Death State

`applyCharacterHealthChange()` должен:

- при уроне сначала снимать временные хиты;
- не пополнять временные хиты при лечении;
- ограничивать текущие хиты диапазоном `0..max`;
- при `mode: 'restore'` ставить текущие хиты в максимум;
- при `mode: 'kill'` ставить текущие хиты в `0`;
- считать `health.isDown`, если `current <= 0`;
- считать `deathSaves.isDead`, если провалов death save `>= 3`.

## Что Нельзя Делать

- Нельзя искать значения по русскому тексту label.
- Нельзя расширять legacy `Стат. блок DnD` как основной путь развития.
- Нельзя автоматически мигрировать старые карточки без отдельной задачи.
- Нельзя заставлять карту напрямую менять HTML, если изменение можно провести через model/facade слой.

## Следующее Развитие

После foundation нужно:

1. подключить `CharacterModel` к карте глубже: рамки здоровья, изменение хитов, инициатива;
2. добавить Inventory System;
3. добавить Effects / Conditions System;
4. определить судьбу archived `DnD v2` и `Variables` через модель, а не через HTML-блок;
5. подготовить интеграцию с `Rule Tree` и `World Packages`.
