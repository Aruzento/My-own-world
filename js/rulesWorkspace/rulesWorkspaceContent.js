import {
  INTERNAL_RULES_WORKSPACE_ENTRIES,
  INTERNAL_RULES_WORKSPACE_OWNER,
  INTERNAL_RULES_WORKSPACE_ROOT_ID,
  INTERNAL_RULES_WORKSPACE_VERSION
} from './rulesWorkspaceSeed.js';


export const INTERNAL_RULES_WORKSPACE_CONTENT_URL =
  './assets/rules/internal-rules-workspace.json';


let contentState =
  normalizeRulesWorkspaceContent({
    kind:
      'InternalRulesWorkspace',
    version:
      INTERNAL_RULES_WORKSPACE_VERSION,
    owner:
      INTERNAL_RULES_WORKSPACE_OWNER,
    rootId:
      INTERNAL_RULES_WORKSPACE_ROOT_ID,
    source:
      'fallbackSeed',
    updatedAt:
      '',
    entries:
      INTERNAL_RULES_WORKSPACE_ENTRIES
  });


// Загружает program-owned JSON правил. Если файл недоступен, приложение
// остается на встроенном seed: обычный workspace пользователя не трогаем.
export async function loadInternalRulesWorkspaceContent({
  url = INTERNAL_RULES_WORKSPACE_CONTENT_URL,
  fetcher = globalThis.fetch
} = {}) {

  if (
    typeof fetcher !== 'function'
  ) {

    return {
      loaded:
        false,
      source:
        contentState.source,
      reason:
        'fetch-unavailable'
    };
  }

  try {

    const response =
      await fetcher(
        url,
        {
          cache:
            'no-store'
        }
      );

    if (
      !response?.ok
    ) {

      throw new Error(
        `HTTP ${response?.status || 'unknown'}`
      );
    }

    const data =
      await response.json();

    setInternalRulesWorkspaceContent(
      data,
      {
        source:
          'programFile',
        url
      }
    );

    return {
      loaded:
        true,
      source:
        'programFile',
      entries:
        contentState.entries.length
    };
  } catch (error) {

    console.warn(
      '[internal-rules-workspace] fallback seed is used:',
      error
    );

    return {
      loaded:
        false,
      source:
        contentState.source,
      reason:
        error?.message || 'load-failed'
    };
  }
}


export function setInternalRulesWorkspaceContent(
  data,
  options = {}
) {

  contentState =
    normalizeRulesWorkspaceContent({
      ...data,
      source:
        options.source || data?.source || 'programFile',
      url:
        options.url || data?.url || ''
    });

  return getInternalRulesWorkspaceContent();
}


export function getInternalRulesWorkspaceContent() {

  return {
    ...contentState,
    entries:
      contentState.entries.map(entry => ({
        ...entry,
        aliases:
          [...entry.aliases],
        tags:
          [...entry.tags]
      }))
  };
}


function normalizeRulesWorkspaceContent(
  data
) {

  const entries =
    Array.isArray(data?.entries)
      ? data.entries
      : [];

  if (
    entries.length === 0
  ) {

    throw new Error(
      'Internal rules workspace must contain entries'
    );
  }

  return {
    kind:
      String(data?.kind || 'InternalRulesWorkspace'),
    version:
      Number(data?.version || INTERNAL_RULES_WORKSPACE_VERSION),
    owner:
      String(data?.owner || INTERNAL_RULES_WORKSPACE_OWNER),
    rootId:
      String(data?.rootId || INTERNAL_RULES_WORKSPACE_ROOT_ID),
    source:
      String(data?.source || 'programFile'),
    url:
      String(data?.url || ''),
    updatedAt:
      String(data?.updatedAt || ''),
    entries:
      entries
        .map(normalizeContentEntry)
        .filter(entry => entry.id)
  };
}


function normalizeContentEntry(
  entry
) {

  return {
    id:
      String(entry?.id || '')
        .trim(),
    parentId:
      entry?.parentId || null,
    title:
      String(entry?.title || 'Правило')
        .trim(),
    aliases:
      Array.isArray(entry?.aliases)
        ? entry.aliases
          .map(alias => String(alias || '').trim())
          .filter(Boolean)
        : [],
    summary:
      String(entry?.summary || '')
        .trim(),
    body:
      String(entry?.body || '')
        .trim(),
    tags:
      Array.isArray(entry?.tags)
        ? entry.tags
          .map(tag => String(tag || '').trim().toLowerCase())
          .filter(Boolean)
        : []
  };
}
