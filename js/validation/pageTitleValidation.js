import {
  findDuplicateTitles,
  getPagesByTitle
} from '../repository/pageRepository.js';


// Единое правило уникальности названий сущностей.
// Сравнение мягкое: без учета регистра и лишних пробелов.

export function normalizePageTitle(
  title
) {

  return String(title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}


export function hasDuplicatePageTitle(
  pageId,
  title
) {

  const normalized =
    normalizePageTitle(
      title
    );

  if (!normalized) return false;

  return getPagesByTitle(
    normalized
  ).some(page =>
    page.id !== pageId
  );
}


export function getDuplicatePageTitleIds() {

  return new Set(
    findDuplicateTitles()
      .flatMap(group =>
        group.pages.map(page =>
          page.id
        )
      )
  );
}


export function getUniqueCopyTitle(
  sourceTitle
) {

  const baseTitle =
    sourceTitle || 'Без названия';

  let index =
    1;

  let title =
    `Копия${index} - ${baseTitle}`;

  while (
    hasDuplicatePageTitle(
      null,
      title
    )
  ) {

    index += 1;

    title =
      `Копия${index} - ${baseTitle}`;
  }

  return title;
}


export function getCampaignMapEntityTitle(
  sourceTitle,
  mapTitle
) {

  return `${sourceTitle || 'Без названия'} - сущность.${mapTitle || 'Карта'}`;
}


export function getCampaignMapNumberedEntityTitle(
  kind,
  mapTitle,
  index
) {

  const prefix =
    kind === 'object'
      ? 'Объект'
      : 'Существо';

  const safeIndex =
    Math.max(
      1,
      Number(index) || 1
    );

  return `${prefix}${safeIndex}.${mapTitle || 'Карта'}`;
}
