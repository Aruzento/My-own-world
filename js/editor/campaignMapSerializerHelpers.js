import {
  writePageContent
} from '../storage/storage.js';

import {
  serializeCampaignMapDocumentHTML
} from './campaignMapDataSerializer.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';


// Helpers для точечного изменения сохраненного HTML карты.
// Закрытые карты патчатся через CampaignMapStore и data-first serializer.

export async function removeTokensFromMapPageContent(
  page,
  ids
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    getMarkdownBody(
      page.content
    );

  const map =
    wrapper.querySelector(
      '.campaign-map-document'
    );

  if (!map) return false;

  const changed =
    removeTokensFromMapElement(
      map,
      ids
    );

  if (!changed) return false;

  const body =
    serializeCampaignMapDocumentHTML(
      map
    );

  const content =
    replaceMarkdownBody(
      page.content,
      body
    );

  await writePageContent(
    page,
    content
  );

  page.content =
    content;

  return true;
}


export function removeTokensFromMapElement(
  map,
  ids
) {

  const store =
    getCampaignMapStore(
      map
    );

  let changed =
    false;

  map
    .querySelectorAll('.campaign-map-token[data-page-id]')
    .forEach(token => {

      if (
        !ids.has(token.dataset.pageId)
      ) return;

      store?.removeToken(
        token.dataset.tokenId
      );

      token.remove();
      changed =
        true;
    });

  return changed;
}


function getMarkdownBody(
  content
) {

  return String(content || '')
    .replace(/---[\s\S]*?---/, '')
    .trim();
}


function replaceMarkdownBody(
  content,
  body
) {

  const frontMatter =
    String(content || '')
      .match(/^---[\s\S]*?---/);

  if (!frontMatter) return body;

  return `${frontMatter[0]}\n\n${body}\n`;
}
