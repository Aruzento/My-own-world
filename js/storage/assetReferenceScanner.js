import { hasStructuredPageData } from './structuredPagePolicy.js';
import { traverseTypedPage } from '../variables/typedPageTraversal.js';
import { parsePageRecordContent } from '../core/pageRecord.js';
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
  pages = [], options = {}
) {

  return pages.flatMap(page =>
    collectAssetReferencesFromPage(
      page, options
    )
  );
}


export function collectAssetReferencesFromPage(
  page = {}, { registry } = {}
) {

  const html =
    String(
      page.content ? parsePageRecordContent(page.content).rawBody : page.body || ''
    );

  const references = collectAssetReferencesFromHTML(
    html,
    {
      pageId:
        page.id || '',
      scope:
        page.kind || page.entityKind || page.type || 'page'
    }
  );
  if (hasStructuredPageData(page)) {
    const result = traverseTypedPage(page, registry, ({ value, field, path }) => {
      if (field.datatype === 'asset' && value?.path) references.push(normalizeAssetReference({
        id: `${page.id}:${path.join('.')}`, path: value.path, type: ASSET_TYPES.image,
        owner: { pageId: page.id, scope: 'variables', sourceKey: path.join('.') }
      }));
    });
    if (!result.complete) references.push({ id: `structured-scan:${page.id || ''}`,
      path: '', type: 'unknown', incomplete: true, diagnostics: result.diagnostics, owner: { pageId: page.id || '' } });
  }
  return references;
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

  references.push(
    ...collectPropertyAssetReferencesFromHTML(
      html,
      owner,
      references.length
    )
  );

  references.push(
    ...collectCampaignMapMusicReferencesFromHTML(
      html,
      owner,
      references.length
    )
  );

  return references.filter(reference =>
    reference.path
  );
}

// Only persistent asset attributes are rewritten; user text and wiki labels stay byte-identical.
export function rewriteBodyAssetPaths(html, pathMap) {
  const attributes = new Set([...Object.keys(ATTRIBUTE_TYPES), 'value', 'data-asset-value']);
  return String(html || '').replace(/<[^>]+>/g, tag => tag.replace(/([\w-]+)\s*=\s*(["'])(.*?)\2/g, (raw, attribute, quote, value) => {
    if (attribute.toLowerCase() === 'data-map-music-state') {
      let data;
      try { data = JSON.parse(decodeURIComponent(decodeHTMLAttribute(value))); }
      catch { throw new Error('Map music asset rewrite is unavailable'); }
      for (const track of [...(data.normal?.tracks || []), ...(data.battle?.tracks || [])]) if (pathMap.has(track.path)) track.path = pathMap.get(track.path);
      return `${attribute}=${quote}${encodeURIComponent(JSON.stringify(data))}${quote}`;
    }
    if (!attributes.has(attribute.toLowerCase()) || ['value', 'data-asset-value'].includes(attribute.toLowerCase()) && !/data-property-asset-type\s*=/.test(tag)) return raw;
    const decoded = decodeHTMLAttribute(value);
    const normalized = normalizeAssetReference({ path: decoded }).path;
    if (!pathMap.has(normalized)) return raw;
    const replacement = pathMap.get(normalized).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    return `${attribute}=${quote}${replacement}${quote}`;
  }));
}


function collectPropertyAssetReferencesFromHTML(
  html,
  owner,
  offset = 0
) {

  const references = [];
  const tagMatcher =
    /<[^>]*data-property-asset-type\s*=\s*["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(tagMatcher)) {

    const type =
      normalizePropertyAssetType(
        decodeHTMLAttribute(
          match[1]
        )
      );

    const path =
      extractAttributeValue(
        match[0],
        'value'
      ) ||
      extractAttributeValue(
        match[0],
        'data-asset-value'
      );

    if (!type || !path) {

      continue;
    }

    references.push(
      normalizeAssetReference({
        id:
          `${owner.pageId || 'page'}:property-asset:${offset + references.length}`,
        path,
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

  return references;
}


function normalizePropertyAssetType(
  type
) {

  if (type === 'audio') return ASSET_TYPES.audio;
  if (type === 'playlist') return ASSET_TYPES.playlist;
  if (type === 'image') return ASSET_TYPES.image;

  return '';
}


function collectCampaignMapMusicReferencesFromHTML(
  html,
  owner,
  offset = 0
) {

  const references = [];
  const matcher =
    createAttributeMatcher(
      'data-map-music-state'
    );

  for (const match of html.matchAll(matcher)) {

    let data =
      null;

    try {

      data =
        JSON.parse(
          decodeURIComponent(
            decodeHTMLAttribute(
              match[1]
            )
          )
        );

    } catch {

      data =
        null;
    }

    [
      ...(data?.normal?.tracks || []),
      ...(data?.battle?.tracks || [])
    ]
      .forEach(track => {

        if (!track?.path) return;

        references.push(
          normalizeAssetReference({
            id:
              `${owner.pageId || 'page'}:campaign-map-music:${offset + references.length}`,
            path:
              track.path,
            type:
              ASSET_TYPES.audio,
            owner: {
              pageId:
                owner.pageId || '',
              entityId:
                track.trackId || '',
              scope:
                'campaignMapMusic'
            }
          })
        );
      });
  }

  return references;
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


function extractAttributeValue(
  tag,
  attribute
) {

  const matcher =
    new RegExp(
      `${attribute}\\s*=\\s*["']([^"']+)["']`,
      'i'
    );

  const match =
    String(tag || '')
      .match(
        matcher
      );

  return match
    ? decodeHTMLAttribute(
      match[1]
    )
    : '';
}
