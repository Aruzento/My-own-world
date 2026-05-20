import {
  hasDuplicatePageTitle
} from '../validation/pageTitleValidation.js';


// Подсветка заголовка открытой сущности при конфликте названий.

export function updateOpenPageTitleWarning(
  editor,
  page
) {

  const titleElement =
    editor.querySelector(
      '.entity-title, .campaign-map-title, .task-tracker-title, h1'
    );

  if (!titleElement || !page) return false;

  const title =
    titleElement.textContent.trim() ||
    titleElement.value ||
    '';

  const duplicated =
    hasDuplicatePageTitle(
      page.id,
      title
    );

  titleElement.classList.toggle(
    'is-title-duplicate',
    duplicated
  );

  if (duplicated) {

    titleElement.title =
      'Название уже используется. Нужно сменить название.';

  } else if (
    titleElement.title === 'Название уже используется. Нужно сменить название.'
  ) {

    titleElement.removeAttribute(
      'title'
    );
  }

  return duplicated;
}
