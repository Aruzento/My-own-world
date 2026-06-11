import {
  createTextBlock,
  createListBlock,
  createItemsBlock,
  createSpellsBlock,
  createSkillsBlock,
  createCharacterEffectsBlock,
  createCharacterSheetBlock,
  createPropertiesBlock,
  createImageBlock,
  createCharacterStatsBlock,
  createDndStatsBlock,
  createTableBlock
} from '../../templates/blockTypes.js';


const BLOCK_CREATORS = {
  text: title =>
    createTextBlock({
      title,
      placeholder: 'Введите текст'
    }),

  list: title =>
    createListBlock({
      title
    }),

  items: title =>
    createItemsBlock({
      title
    }),

  spells: title =>
    createSpellsBlock({
      title
    }),

  skills: title =>
    createSkillsBlock({
      title
    }),

  characterEffects: title =>
    createCharacterEffectsBlock({
      title
    }),

  characterSheet: title =>
    createCharacterSheetBlock({
      title
    }),

  properties: (title, options = {}) => {
    return createPropertiesBlock({
      title,
      cardType: options.cardType
    });
  },

  image: () =>
    createImageBlock(),

  characterStats: title =>
    createCharacterStatsBlock({
      title
    }),

  dndStats: title =>
    createDndStatsBlock({
      title
    }),

  table: (title, options = {}) =>
    createTableBlock({
      title,
      rows: options.rows,
      columns: options.columns
    })
};


/* Создаёт DOM-элемент блока по его типу.
   Остальной редактор работает уже с DOM, поэтому HTML-шаблон сразу
   разворачивается во временном контейнере. */
export function createTypedBlock(
  type,
  title,
  options = {}
) {

  const createBlock =
    BLOCK_CREATORS[type] ||
    BLOCK_CREATORS.text;

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    createBlock(
      title,
      options
    );

  return wrapper.firstElementChild;
}
