import {
  createTextBlock
} from './blockTypes.js';


export function createCardShellTemplate() {

  return {
    name: 'Карточка',

    template: 'card',

    tags: ['card'],

    iconSvg: `
      <svg viewBox="0 0 24 24">
        <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
      </svg>
    `,

    content: `
      <div
        class="entity-layout card-shell"
        data-card-shell="v1"
        contenteditable="false"
      >

        <section class="entity-header" contenteditable="false">

          <div class="entity-header-main" contenteditable="false">

            <div class="card-meta" contenteditable="false">
              <span class="card-meta-label">Теги</span>
              <div class="inline-tag-list"></div>
              <input class="inline-tag-input" data-runtime="true" placeholder="tag">
              <button class="inline-add-tag-btn" data-runtime="true">+</button>
            </div>

            <div class="template-block hero-block" contenteditable="false">

              <h1
                contenteditable="true"
                class="singleline-field"
                data-placeholder="Название карточки"
              ></h1>

              <div class="card-type-row" contenteditable="false">
                <span class="card-type-label">Тип:</span>

                <select class="card-type-select">
                  <option value="character">Персонаж</option>
                  <option value="location">Локация</option>
                  <option value="region">Регион</option>
                  <option value="folder">Папка</option>
                  <option value="magic">Магия</option>
                  <option value="item">Предмет</option>
                  <option value="lore">Лор</option>
                  <option value="note">Заметка</option>
                </select>
              </div>

              

              <div class="aliases-meta" contenteditable="false">
                <span class="aliases-label">Так же известный как:</span>
                <div class="inline-alias-list"></div>
                <input class="inline-alias-input" data-runtime="true" placeholder="alias">
                <button class="inline-add-alias-btn" data-runtime="true">+</button>
              </div>

              <div
  contenteditable="true"
  class="card-short-description rich-text-field"
  data-placeholder="Краткое описание карточки"
></div>

            </div>

          </div>

          <div class="media-box is-portrait" contenteditable="false">
            <button class="upload-portrait-btn" data-runtime="true">
              + Image
            </button>
          </div>

        </section>

        <section class="entity-main" contenteditable="false">

          ${createTextBlock({
            title: 'Описание',
            placeholder: 'Описание карточки'
          })}

        </section>

      </div>
    `
  };
}
