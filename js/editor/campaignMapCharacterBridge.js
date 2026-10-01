import {
  getCharacterEffectiveArmorClass,
  getCharacterEffectiveSpeed,
  getCharacterEffectsCombatSummary,
  getCharacterHealth,
  getCharacterInitiativeModifier,
  readCharacterModelFromPage
} from '../character/characterModel.js';

import { parsePageRecordContent } from '../core/pageRecord.js';
import * as PageRepository from '../repository/pageRepository.js';
import {
  createCardTypeRegistryFromCatalog,
  readCardTypeCatalog
} from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { state } from '../state.js';


const mapCharacterContexts = new WeakMap();


// Контекст живёт вместе с открытой картой. Он не является новым Registry owner:
// structured-карточки читаются только из точного activated workspace catalog,
// а legacy-only карта не обращается к каталогу вообще.
export async function prepareCampaignMapCharacterContext(
  map,
  {
    pages = state.pages,
    includePages = [],
    storageAdapter = null,
    workspaceContext = null
  } = {}
) {
  const linkedPages = collectLinkedPages(map, pages, includePages);
  const hasStructured = linkedPages.some(isStructuredPage);
  const repository = createRepository(pages);

  if (!hasStructured) {
    const context = Object.freeze({
      kind: 'CampaignMapCharacterContext', version: 1,
      mode: 'legacy-only', registry: null, repository,
      workspaceContext: null, catalogIdentity: null, reason: ''
    });
    if (map) mapCharacterContexts.set(map, context);
    return context;
  }

  try {
    const captured = workspaceContext || captureStorageWorkspaceContext();
    const current = await readCardTypeCatalog({
      storageAdapter: storageAdapter || captured.adapter
    });

    if (!current.exists) {
      return bindUnavailableContext(map, repository, captured, 'activated-catalog-missing');
    }

    const context = Object.freeze({
      kind: 'CampaignMapCharacterContext', version: 1,
      mode: 'source-aware',
      registry: createCardTypeRegistryFromCatalog(current.catalog, {
        bundledTypes: [], bundledFieldSets: []
      }),
      repository, workspaceContext: captured,
      catalogIdentity: current.identity, reason: ''
    });
    if (map) mapCharacterContexts.set(map, context);
    return context;
  } catch (error) {
    return bindUnavailableContext(
      map, repository, workspaceContext,
      error?.code || error?.message || 'catalog-unavailable'
    );
  }
}


export function getCampaignMapCharacterContext(map) {
  return map ? mapCharacterContexts.get(map) || null : null;
}


export function getCampaignMapCharacterState(
  page,
  { map = null, context = null, pages = state.pages } = {}
) {
  if (!page) return null;

  const activeContext = context || getCampaignMapCharacterContext(map);
  const structured = isStructuredPage(page);
  if (!structured) return null; // Explicit migration required; old HTML is recovery data.
  if (structured && !activeContext?.registry) return null;

  const model = readCharacterModelFromPage(page, {
    pages,
    ...(structured ? {
      registry: activeContext.registry,
      repository: activeContext.repository
    } : {})
  });

  if (model.source === 'empty' || model.source === 'structured-unavailable') return null;
  if (structured && model.source !== 'entity') return null;

  return {
    model,
    health: getCharacterHealth(model),
    initiativeModifier: getCharacterInitiativeModifier(model),
    armorClass: getCharacterEffectiveArmorClass(model),
    speed: getCharacterEffectiveSpeed(model),
    effects: getCharacterEffectsCombatSummary(model),
    source: model.source
  };
}


export function createCampaignMapCharacterTokenSnapshot(page, options = {}) {
  const characterState = getCampaignMapCharacterState(page, options);
  if (!characterState) return null;

  const health = characterState.health || null;
  const effects = characterState.effects || {};
  const conditionLabels = effects.conditionLabels || [];
  const effectTitles = effects.effectTitles || [];
  const flags = effects.flags || {};

  return {
    hp: health?.current ?? '', hpMax: health?.max ?? '', hpTemp: health?.temp ?? '',
    initiativeModifier: characterState.initiativeModifier,
    armorClass: characterState.armorClass ?? '', speed: characterState.speed ?? '',
    conditionCount: conditionLabels.length, effectCount: effectTitles.length,
    effectsSummary: [...conditionLabels, ...effectTitles].join(', '),
    incapacitated: Boolean(flags.isIncapacitated),
    speedZero: Boolean(flags.speedIsZero)
  };
}


export function getCampaignMapCharacterEffects(page, options = {}) {
  return getCampaignMapCharacterState(page, options)?.effects || null;
}


export function getCampaignMapCharacterHealth(page, options = {}) {
  return getCampaignMapCharacterState(page, options)?.health || null;
}


export function getCampaignMapCharacterInitiativeModifier(
  page,
  fallback = 0,
  options = {}
) {
  const characterState = getCampaignMapCharacterState(page, options);
  return characterState ? characterState.initiativeModifier : fallback;
}


export function isCampaignMapStructuredPage(page) {
  return isStructuredPage(page);
}


function collectLinkedPages(map, pages, includePages) {
  const byId = new Map(
    (pages || []).filter(page => page?.id).map(page => [page.id, page])
  );
  const result = new Map(
    (includePages || []).filter(page => page?.id).map(page => [page.id, page])
  );

  map?.querySelectorAll?.('.campaign-map-token[data-page-id]')?.forEach(token => {
    const page = byId.get(token.dataset.pageId);
    if (page) result.set(page.id, page);
  });
  return [...result.values()];
}


function createRepository(pages) {
  const byId = new Map(
    (pages || []).filter(page => page?.id).map(page => [page.id, page])
  );
  return Object.freeze({
    getPageById(id) {
      return byId.get(id) || PageRepository.getPageById(id);
    }
  });
}


function bindUnavailableContext(map, repository, workspaceContext, reason) {
  const context = Object.freeze({
    kind: 'CampaignMapCharacterContext', version: 1,
    mode: 'structured-unavailable', registry: null, repository,
    workspaceContext: workspaceContext || null, catalogIdentity: null,
    reason: String(reason || 'catalog-unavailable')
  });
  if (map) mapCharacterContexts.set(map, context);
  return context;
}


function isStructuredPage(page) {
  if (!page?.content) return false;
  return parsePageRecordContent(page.content, { generateId: false })
    .variablesStatus.mode !== 'legacy';
}
