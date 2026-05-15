import { state } from '../state.js';


export function findPageByTitle(
  title
) {

  const normalizedTitle =
    normalizePageName(
      title
    );

  return state.pages.find(page => {

    if (
      normalizePageName(page.title) === normalizedTitle
    ) {

      return true;
    }

    const aliases =
      page.aliases || [];

    return aliases.some(alias =>
      normalizePageName(alias) === normalizedTitle
    );
  });
}


export function normalizePageName(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
