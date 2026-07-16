import {
  findDuplicateTitles,
  getPagesByTitle
} from '../repository/pageRepository.js';


const PAGE_TITLE_TEXT =
  Object.freeze({
    untitled:
      '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f',
    copy:
      '\u041a\u043e\u043f\u0438\u044f',
    map:
      '\u041a\u0430\u0440\u0442\u0430',
    mapEntity:
      '\u0441\u0443\u0449\u043d\u043e\u0441\u0442\u044c',
    object:
      '\u041e\u0431\u044a\u0435\u043a\u0442',
    creature:
      '\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u043e'
  });


// Soft uniqueness rule for entity titles: case-insensitive and whitespace-safe.
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
    sourceTitle || PAGE_TITLE_TEXT.untitled;

  let index =
    1;

  let title =
    `${PAGE_TITLE_TEXT.copy}${index} - ${baseTitle}`;

  while (
    hasDuplicatePageTitle(
      null,
      title
    )
  ) {

    index += 1;

    title =
      `${PAGE_TITLE_TEXT.copy}${index} - ${baseTitle}`;
  }

  return title;
}


export function getCampaignMapEntityTitle(
  sourceTitle,
  mapTitle
) {

  return `${sourceTitle || PAGE_TITLE_TEXT.untitled} - ${PAGE_TITLE_TEXT.mapEntity}.${mapTitle || PAGE_TITLE_TEXT.map}`;
}


export function getCampaignMapNumberedEntityTitle(
  kind,
  mapTitle,
  index
) {

  const prefix =
    kind === 'object'
      ? PAGE_TITLE_TEXT.object
      : PAGE_TITLE_TEXT.creature;

  const safeIndex =
    Math.max(
      1,
      Number(index) || 1
    );

  return `${prefix}${safeIndex}.${mapTitle || PAGE_TITLE_TEXT.map}`;
}
