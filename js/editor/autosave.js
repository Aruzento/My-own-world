import { state } from '../state.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  setStatus
} from '../ui/ui.js';

export function setupAutosave(
  editor
) {

  let timeout = null;

  editor.addEventListener(
    'input',
    () => {

      clearTimeout(timeout);

      timeout = setTimeout(
        () => {
          saveCurrentPage(
            editor
          );
        },
        500
      );
    }
  );
}


export async function saveCurrentPage(
  editor
) {

  if (!state.currentPage) return;

  const tags =
    state.currentPage.tags || [];

  const aliases =
  state.currentPage.aliases || [];

  const template =
  state.currentPage.template || '';

  const type =
  state.currentPage.type || 'note';

  const content =
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: ${template}
type: ${type}
aliases: [${aliases.join(', ')}]
---

${getCleanEditorHTML(editor)}
`;

  const titleElement =
    editor.querySelector('h1');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Без названия';

  const writable =
    await state.currentPage.handle
      .createWritable();

  await writable.write(content);

  await writable.close();

  state.currentPage.content =
    content;

  setStatus('Сохранено');

  renderTree();
}

function getCleanEditorHTML(
  editor
) {

  const clone =
    editor.cloneNode(true);
  
    syncFormValuesForSave(
  editor,
  clone
);

  clone.querySelectorAll(
    [
      '.block-actions',
      '.blocks-toolbar',
      '.add-block-row',
      '.backlinks-list'
    ].join(',')
  ).forEach(element => {

    element.remove();
  });


  clone.querySelectorAll(
    '.inline-tag-list'
  ).forEach(element => {

    element.innerHTML = '';
  });


  clone.querySelectorAll(
    '.inline-alias-list'
  ).forEach(element => {

    element.innerHTML = '';
  });


  clone.querySelectorAll(
    'img[data-asset]'
  ).forEach(img => {

    img.removeAttribute(
      'src'
    );
  });


  return clone.innerHTML;
}

/* Синхронизирует значения input/select/textarea перед сохранением */
function syncFormValuesForSave(
  source,
  clone
) {

  /* Берём все поля из живого editor */
  const sourceFields =
    source.querySelectorAll(
      'input, textarea, select'
    );

  /* Берём такие же поля из клона */
  const cloneFields =
    clone.querySelectorAll(
      'input, textarea, select'
    );

  /* Проходим по каждому полю */
  sourceFields.forEach((sourceField, index) => {

    /* Находим соответствующее поле в клоне */
    const cloneField =
      cloneFields[index];

    /* Если поля в клоне нет — выходим */
    if (!cloneField) return;

    /* Если это input */
    if (
      sourceField.tagName === 'INPUT'
    ) {

      /* Сохраняем текущее значение в HTML-атрибут */
      cloneField.setAttribute(
        'value',
        sourceField.value
      );
      /* Если input является checkbox */
if (
  sourceField.type === 'checkbox'
) {

  /* Если checkbox отмечен */
  if (sourceField.checked) {

    /* Сохраняем checked в HTML */
    cloneField.setAttribute(
      'checked',
      'checked'
    );

  } else {

    /* Если checkbox снят — удаляем checked */
    cloneField.removeAttribute(
      'checked'
    );
  }
}
    }

    /* Если это textarea */
    if (
      sourceField.tagName === 'TEXTAREA'
    ) {

      /* Сохраняем текст textarea внутрь элемента */
      cloneField.textContent =
        sourceField.value;
    }

    /* Если это select */
    if (
      sourceField.tagName === 'SELECT'
    ) {

      /* Сохраняем выбранное значение */
      cloneField
        .querySelectorAll('option')
        .forEach(option => {

          /* Убираем старый selected */
          option.removeAttribute(
            'selected'
          );

          /* Ставим selected на выбранный option */
          if (
            option.value === sourceField.value
          ) {

            option.setAttribute(
              'selected',
              'selected'
            );
          }
        });
    }
  });
}