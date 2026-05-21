import { state } from '../state.js';


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

  return state.pages.some(page =>
    page.id !== pageId &&
    normalizePageTitle(page.title) === normalized
  );
}


export function getDuplicatePageTitleIds() {

  const groups =
    new Map();

  state.pages.forEach(page => {

    const normalized =
      normalizePageTitle(
        page.title
      );

    if (!normalized) return;

    if (!groups.has(normalized)) {

      groups.set(
        normalized,
        []
      );
    }

    groups.get(normalized).push(
      page.id
    );
  });

  return new Set(
    [...groups.values()]
      .filter(ids => ids.length > 1)
      .flat()
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
