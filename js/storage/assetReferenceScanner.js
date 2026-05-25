import {
  ASSET_TYPES,
  normalizeAssetReference
} from './assetReference.js';


const ATTRIBUTE_TYPES =
  Object.freeze({
    'data-asset': ASSET_TYPES.image,
    'data-asset-path': ASSET_TYPES.image,
    'data-map-asset': ASSET_TYPES.mapBackground,
    'data-image-asset': ASSET_TYPES.mapObjectPng,
    'data-audio-asset': ASSET_TYPES.audio,
    'data-playlist-asset': ASSET_TYPES.playlist
  });


// Собирает persistent-ссылки на ассеты из HTML страниц без запуска runtime UI.
export function collectAssetReferencesFromPages(
  pages = []
) {

  return pages.flatMap(page =>
    collectAssetReferencesFromPage(
      page
    )
  );
}


export function collectAssetReferencesFromPage(
  page = {}
) {

  const html =
    String(
      page.body || page.content || ''
    );

  return collectAssetReferencesFromHTML(
    html,
    {
      pageId:
        page.id || '',
      scope:
        page.kind || page.entityKind || page.type || 'page'
    }
  );
}


export function collectAssetReferencesFromHTML(
  html,
  owner = {}
) {

  const references = [];

  for (const [attribute, type] of Object.entries(ATTRIBUTE_TYPES)) {

    const matcher =
      createAttributeMatcher(
        attribute
      );

    for (const match of html.matchAll(matcher)) {

      references.push(
        normalizeAssetReference({
          id:
            `${owner.pageId || 'page'}:${attribute}:${references.length}`,
          path:
            decodeHTMLAttribute(
              match[1]
            ),
          type,
          owner: {
            pageId:
              owner.pageId || '',
            entityId:
              '',
            scope:
              owner.scope || 'page'
          }
        })
      );
    }
  }

  return references.filter(reference =>
    reference.path
  );
}


function createAttributeMatcher(
  attribute
) {

  return new RegExp(
    `${attribute}\\s*=\\s*["']([^"']+)["']`,
    'gi'
  );
}


function decodeHTMLAttribute(
  value
) {

  return String(value)
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}
