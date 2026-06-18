import {
  getInternalRulesWorkspaceContent,
  loadInternalRulesWorkspaceContent,
  setInternalRulesWorkspaceContent
} from './rulesWorkspaceContent.js';


const INTERNAL_RULE_ID_PREFIX =
  'internal-rule:';


let cachedContent =
  null;

let cachedIndex =
  null;


export {
  loadInternalRulesWorkspaceContent,
  setInternalRulesWorkspaceContent
};


export function getInternalRulesWorkspaceMeta() {

  const content =
    getIndexedRulesWorkspace().content;

  return {
    kind:
      content.kind,
    version:
      content.version,
    owner:
      content.owner,
    rootId:
      content.rootId,
    source:
      content.source,
    updatedAt:
      content.updatedAt,
    url:
      content.url,
    entries:
      content.entries.length
  };
}


export function getInternalRuleEntries() {

  return getIndexedRulesWorkspace()
    .content
    .entries
    .map(entry => ({
    ...entry,
    aliases:
      [...entry.aliases],
    tags:
      [...entry.tags]
  }));
}


export function getInternalRuleChildren(
  parentId = null
) {

  return getInternalRuleEntries()
    .filter(entry =>
      entry.parentId === parentId
    );
}


export function findInternalRuleByTitleOrAlias(
  value
) {

  const key =
    normalizeRuleLookupValue(
      value
    );

  if (!key) return null;

  return cloneRuleEntry(
    getIndexedRulesWorkspace()
      .byLookupKey
      .get(
      key
    )
  );
}


export function findInternalRuleByPageId(
  pageId
) {

  const ruleId =
    getRuleIdFromInternalPageId(
      pageId
    );

  if (!ruleId) return null;

  return cloneRuleEntry(
    getIndexedRulesWorkspace()
      .byId
      .get(
      ruleId
    )
  );
}


export function createInternalRulePage(
  entry
) {

  if (!entry) return null;

  const normalized =
    normalizeRuleEntry(
      entry
    );

  const id =
    createInternalRulePageId(
      normalized.id
    );

  return {
    id,
    title:
      normalized.title,
    name:
      normalized.title,
    parent:
      null,
    order:
      0,
    template:
      'internalRule',
    type:
      'internalRule',
    tags: [
      'internal-rule',
      ...normalized.tags
    ],
    aliases:
      normalized.aliases,
    source:
      'internalRulesWorkspace',
    readOnly:
      true,
    ruleId:
      normalized.id,
    ruleParentId:
      normalized.parentId,
    summary:
      normalized.summary,
    content:
      createInternalRuleMarkdown(
        normalized,
        id
      )
  };
}


export function createInternalRulePageId(
  ruleId
) {

  return `${INTERNAL_RULE_ID_PREFIX}${ruleId}`;
}


export function isInternalRulePageId(
  pageId
) {

  return String(pageId || '')
    .startsWith(
      INTERNAL_RULE_ID_PREFIX
    );
}


export function normalizeRuleLookupValue(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}


function normalizeRuleEntry(
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


function createLookupIndex(
  entries
) {

  const map =
    new Map();

  entries.forEach(entry => {

    [
      entry.title,
      ...entry.aliases
    ].forEach(value => {

      const key =
        normalizeRuleLookupValue(
          value
        );

      if (
        key &&
        !map.has(key)
      ) {

        map.set(
          key,
          entry
        );
      }
    });
  });

  return map;
}


function getIndexedRulesWorkspace() {

  const content =
    getInternalRulesWorkspaceContent();

  if (
    cachedContent === content
  ) {

    return cachedIndex;
  }

  const entries =
    content.entries.map(
      normalizeRuleEntry
    );

  cachedContent =
    content;

  cachedIndex = {
    content: {
      ...content,
      entries
    },
    byId:
      new Map(
        entries.map(entry => [
          entry.id,
          entry
        ])
      ),
    byLookupKey:
      createLookupIndex(
        entries
      )
  };

  return cachedIndex;
}


function getRuleIdFromInternalPageId(
  pageId
) {

  const value =
    String(pageId || '');

  if (
    !isInternalRulePageId(
      value
    )
  ) return '';

  return value.slice(
    INTERNAL_RULE_ID_PREFIX.length
  );
}


function cloneRuleEntry(
  entry
) {

  if (!entry) return null;

  return {
    ...entry,
    aliases:
      [...entry.aliases],
    tags:
      [...entry.tags]
  };
}


function createInternalRuleMarkdown(
  entry,
  pageId
) {

  return `---
id: ${pageId}
parent: null
order: 0
tags: [internal-rule, ${entry.tags.join(', ')}]
template: internalRule
type: internalRule
aliases: [${entry.aliases.join(', ')}]
---

<article class="internal-rule-document" data-internal-rule-id="${escapeAttribute(entry.id)}" contenteditable="false">
  <p class="internal-rule-kicker">Внутренние правила DnD</p>
  <h1>${escapeHTML(entry.title)}</h1>
  <p class="internal-rule-summary">${escapeHTML(entry.summary)}</p>
  <div class="internal-rule-body">${escapeHTML(entry.body)}</div>
  <p class="internal-rule-note">Это справочник. Расчеты выполняет программа по контракту DND_CALCULATION_RULES.md.</p>
</article>`;
}


function escapeHTML(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );
}
