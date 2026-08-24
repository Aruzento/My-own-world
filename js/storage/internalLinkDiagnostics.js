import {
  parseMarkdown
} from '../core/markdown.js';

import {
  PageIndex
} from '../repository/pageIndex.js';

import {
  getAllPages,
  getPageIndex
} from '../repository/pageRepository.js';

import {
  createInternalRulePage,
  findInternalRuleByPageId,
  findInternalRuleByTitleOrAlias
} from '../rulesWorkspace/rulesWorkspaceIndex.js';


export const INTERNAL_LINK_TYPES =
  Object.freeze({
    wiki:
      'wiki',
    internalPage:
      'internal-page',
    relationship:
      'relationship'
  });


export const INTERNAL_LINK_REASONS =
  Object.freeze({
    targetPageMissing:
      'TARGET_PAGE_MISSING',
    targetIdUnknown:
      'TARGET_ID_UNKNOWN',
    relationEndpointMissing:
      'RELATION_ENDPOINT_MISSING',
    malformedInternalReference:
      'MALFORMED_INTERNAL_REFERENCE',
    targetAmbiguous:
      'TARGET_AMBIGUOUS'
  });


const WIKI_LINK_PATTERN =
  /\[\[([^\]]+)\]\]/g;

const ANCHOR_PATTERN =
  /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

const EXTERNAL_URL_PATTERN =
  /^(?:https?:|mailto:|tel:|file:|blob:|data:)/i;

const INTERNAL_LINK_VISIBLE_ROWS =
  8;


export function buildBrokenInternalLinkReport({
  pages = null,
  pageIndex = null
} = {}) {

  const sourcePages =
    Array.isArray(
      pages
    )
      ? pages
      : getAllPages();

  const index =
    pageIndex ||
    (
      Array.isArray(
        pages
      )
        ? new PageIndex(
          sourcePages
        )
        : getPageIndex()
    );

  const resolver =
    createPageResolver(
      index
    );

  const references =
    collectInternalLinkReferencesFromPages(
      sourcePages
    );

  const issues =
    references
      .map(reference =>
        createBrokenInternalLinkIssue(
          reference,
          resolveInternalReference(
            reference,
            resolver
          )
        )
      )
      .filter(Boolean);

  return {
    status:
      issues.length
        ? 'needs-review'
        : 'ok',
    summary:
      createInternalLinkSummary(
        references,
        issues
      ),
    references,
    issues,
    groups:
      groupInternalLinkIssues(
        issues
      )
  };
}


export function collectInternalLinkReferencesFromPages(
  pages = []
) {

  return pages.flatMap(page =>
    collectInternalLinkReferencesFromPage(
      page
    )
  );
}


export function collectInternalLinkReferencesFromPage(
  page = {}
) {

  const parsed =
    parsePageSafely(
      page
    );

  const source =
    createSourcePageInfo(
      page,
      parsed
    );

  const body =
    parsed.body ||
    page.body ||
    '';

  return [
    ...collectAnchorInternalLinks(
      body,
      source
    ),
    ...collectRawWikiLinks(
      removeAnchorTags(
        body
      ),
      source
    ),
    ...collectRelationshipLinks(
      page.relationships ||
      parsed.relationships ||
      [],
      source
    )
  ];
}


function createBrokenInternalLinkIssue(
  reference,
  resolution
) {

  if (resolution.ok) return null;

  return {
    category:
      'broken-internal-link',
    id:
      `${reference.sourcePageId}:${reference.linkType}:${reference.index}:${resolution.reason}`,
    linkType:
      reference.linkType,
    reason:
      resolution.reason,
    sourcePageId:
      reference.sourcePageId,
    sourcePageTitle:
      reference.sourcePageTitle,
    owner:
      reference.owner,
    originalTarget:
      reference.originalTarget,
    targetId:
      reference.targetId,
    targetTitle:
      reference.targetTitle,
    displayText:
      reference.displayText,
    relationshipType:
      reference.relationshipType,
    index:
      reference.index,
    candidateCount:
      resolution.candidateCount || 0
  };
}


function resolveInternalReference(
  reference,
  resolver
) {

  if (
    reference.malformed
  ) {

    return {
      ok:
        false,
      reason:
        reference.linkType === INTERNAL_LINK_TYPES.relationship
          ? INTERNAL_LINK_REASONS.targetIdUnknown
          : INTERNAL_LINK_REASONS.malformedInternalReference
    };
  }

  if (
    reference.targetId
  ) {

    const idResolution =
      resolver.resolveById(
        reference.targetId
      );

    if (idResolution.ok) {

      return idResolution;
    }
  }

  if (
    reference.targetTitle
  ) {

    const titleResolution =
      resolver.resolveByTitleOrAlias(
        reference.targetTitle
      );

    if (titleResolution.ok) {

      return titleResolution;
    }

    if (titleResolution.ambiguous) {

      return {
        ok:
          false,
        reason:
          INTERNAL_LINK_REASONS.targetAmbiguous,
        candidateCount:
          titleResolution.candidateCount
      };
    }
  }

  if (
    reference.linkType === INTERNAL_LINK_TYPES.relationship
  ) {

    return {
      ok:
        false,
      reason:
        INTERNAL_LINK_REASONS.relationEndpointMissing
    };
  }

  return {
    ok:
      false,
    reason:
      INTERNAL_LINK_REASONS.targetPageMissing
  };
}


function createPageResolver(
  pageIndex
) {

  return {
    resolveById(
      id
    ) {

      const normalizedId =
        normalizeText(
          id
        );

      if (!normalizedId) {

        return {
          ok:
            false
        };
      }

      const page =
        pageIndex.getPageById(
          normalizedId
        ) ||
        createInternalRulePage(
          findInternalRuleByPageId(
            normalizedId
          )
        );

      return page
        ? {
          ok:
            true,
          page
        }
        : {
          ok:
            false
        };
    },

    resolveByTitleOrAlias(
      value
    ) {

      const normalizedValue =
        normalizeText(
          value
        );

      if (!normalizedValue) {

        return {
          ok:
            false
        };
      }

      const pages =
        uniquePagesById([
          ...pageIndex.getPagesByTitle(
            normalizedValue
          ),
          ...pageIndex.getPagesByAlias(
            normalizedValue
          )
        ]);

      if (pages.length === 1) {

        return {
          ok:
            true,
          page:
            pages[0]
        };
      }

      if (pages.length > 1) {

        return {
          ok:
            false,
          ambiguous:
            true,
          candidateCount:
            pages.length
        };
      }

      const internalRulePage =
        createInternalRulePage(
          findInternalRuleByTitleOrAlias(
            normalizedValue
          )
        );

      return internalRulePage
        ? {
          ok:
            true,
          page:
            internalRulePage
        }
        : {
          ok:
            false
        };
    }
  };
}


function collectAnchorInternalLinks(
  html,
  source
) {

  const references =
    [];

  ANCHOR_PATTERN.lastIndex =
    0;

  let match;

  while (
    (match = ANCHOR_PATTERN.exec(String(html || '')))
  ) {

    const attrs =
      parseHTMLAttributes(
        match[1]
      );

    const classNames =
      new Set(
        normalizeText(
          attrs.class
        )
          .split(/\s+/)
          .filter(Boolean)
      );

    const href =
      normalizeText(
        attrs.href
      );

    const targetId =
      normalizeText(
        attrs['data-page-id']
      );

    const targetTitle =
      normalizeText(
        attrs['data-page-title']
      );

    const displayText =
      getPlainText(
        match[2]
      );

    const isWikiLink =
      classNames.has(
        'wiki-link'
      );

    if (isWikiLink) {

      references.push(
        createInternalReference({
          source,
          linkType:
            INTERNAL_LINK_TYPES.wiki,
          index:
            references.length,
          targetId,
          targetTitle,
          displayText,
          originalTarget:
            targetTitle ||
            targetId ||
            displayText,
          malformed:
            !targetId &&
            !targetTitle
        })
      );

      continue;
    }

    const hasPageTarget =
      Boolean(
        targetId ||
        targetTitle
      );

    const isInternalLink =
      classNames.has(
        'internal-link'
      );

    if (
      !hasPageTarget &&
      !isInternalLink
    ) {

      continue;
    }

    if (
      !hasPageTarget &&
      EXTERNAL_URL_PATTERN.test(
        href
      )
    ) {

      continue;
    }

    references.push(
      createInternalReference({
        source,
        linkType:
          INTERNAL_LINK_TYPES.internalPage,
        index:
          references.length,
        targetId,
        targetTitle,
        displayText,
        originalTarget:
          targetTitle ||
          targetId ||
          displayText,
        malformed:
          !targetId &&
          !targetTitle
      })
    );
  }

  return references;
}


function collectRawWikiLinks(
  html,
  source
) {

  const references =
    [];

  WIKI_LINK_PATTERN.lastIndex =
    0;

  let match;

  while (
    (match = WIKI_LINK_PATTERN.exec(String(html || '')))
  ) {

    const expression =
      normalizeText(
        match[1]
      );

    const targetTitle =
      normalizeText(
        expression.split('|')[0]
      );

    references.push(
      createInternalReference({
        source,
        linkType:
          INTERNAL_LINK_TYPES.wiki,
        index:
          references.length,
        targetTitle,
        displayText:
          normalizeText(
            expression.split('|')[1]
          ) ||
          targetTitle,
        originalTarget:
          targetTitle ||
          expression,
        malformed:
          !targetTitle
      })
    );
  }

  return references;
}


function collectRelationshipLinks(
  relationships,
  source
) {

  if (
    !Array.isArray(
      relationships
    )
  ) {

    return [];
  }

  return relationships.map((relationship, index) => {

    const targetId =
      normalizeText(
        relationship?.targetId ||
        relationship?.pageId ||
        relationship?.id
      );

    const targetTitle =
      normalizeText(
        relationship?.targetTitle ||
        relationship?.target ||
        relationship?.title
      );

    return createInternalReference({
      source,
      linkType:
        INTERNAL_LINK_TYPES.relationship,
      index,
      targetId,
      targetTitle,
      relationshipType:
        normalizeText(
          relationship?.type
        ),
      displayText:
        normalizeText(
          relationship?.label ||
          relationship?.title ||
          relationship?.type
        ),
      originalTarget:
        targetId ||
        targetTitle,
      malformed:
        !targetId &&
        !targetTitle
    });
  });
}


function createInternalReference({
  source,
  linkType,
  index,
  targetId = '',
  targetTitle = '',
  relationshipType = '',
  displayText = '',
  originalTarget = '',
  malformed = false
}) {

  return {
    linkType,
    sourcePageId:
      source.pageId,
    sourcePageTitle:
      source.pageTitle,
    owner: {
      pageId:
        source.pageId,
      pageTitle:
        source.pageTitle,
      scope:
        linkType,
      entityId:
        relationshipType
          ? `${relationshipType}:${index}`
          : String(index)
    },
    index,
    targetId,
    targetTitle,
    relationshipType,
    displayText,
    originalTarget,
    malformed
  };
}


function groupInternalLinkIssues(
  issues
) {

  const groups =
    new Map();

  issues.forEach(issue => {

    const key =
      [
        issue.linkType,
        issue.reason
      ].join(':');

    if (!groups.has(key)) {

      groups.set(
        key,
        {
          linkType:
            issue.linkType,
          reason:
            issue.reason,
          count:
            0,
          examples:
            []
        }
      );
    }

    const group =
      groups.get(key);

    group.count +=
      1;

    if (
      group.examples.length < INTERNAL_LINK_VISIBLE_ROWS
    ) {

      group.examples.push(
        issue
      );
    }
  });

  return [...groups.values()]
    .sort((left, right) =>
      left.linkType.localeCompare(
        right.linkType
      ) ||
      left.reason.localeCompare(
        right.reason
      )
    );
}


function createInternalLinkSummary(
  references,
  issues
) {

  return {
    referenceCount:
      references.length,
    issueCount:
      issues.length,
    byType:
      countBy(
        issues,
        issue =>
          issue.linkType
      ),
    byReason:
      countBy(
        issues,
        issue =>
          issue.reason
      )
  };
}


function parsePageSafely(
  page
) {

  try {

    return parseMarkdown(
      page.content ||
      page.body ||
      ''
    );

  } catch {

    return {
      id:
        page.id || '',
      title:
        page.title || page.name || page.id || 'Без названия',
      body:
        page.body || '',
      relationships:
        Array.isArray(page.relationships)
          ? page.relationships
          : []
    };
  }
}


function createSourcePageInfo(
  page,
  parsed
) {

  return {
    pageId:
      page.id ||
      parsed.id ||
      '',
    pageTitle:
      page.title ||
      page.name ||
      parsed.title ||
      page.id ||
      'Без названия'
  };
}


function parseHTMLAttributes(
  value
) {

  const attrs =
    {};

  const source =
    String(
      value || ''
    );

  const pattern =
    /([A-Za-z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match;

  while (
    (match = pattern.exec(source))
  ) {

    attrs[match[1].toLowerCase()] =
      decodeHTMLAttribute(
        match[2] ??
        match[3] ??
        match[4] ??
        ''
      );
  }

  return attrs;
}


function removeAnchorTags(
  html
) {

  ANCHOR_PATTERN.lastIndex =
    0;

  return String(html || '').replace(
    ANCHOR_PATTERN,
    ''
  );
}


function getPlainText(
  html
) {

  return decodeHTMLAttribute(
    String(html || '')
      .replace(
        /<[^>]+>/g,
        ''
      )
  )
    .replace(/\s+/g, ' ')
    .trim();
}


function decodeHTMLAttribute(
  value
) {

  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}


function normalizeText(
  value
) {

  return String(value || '')
    .trim();
}


function uniquePagesById(
  pages
) {

  const byId =
    new Map();

  pages.forEach(page => {

    if (!page?.id) return;

    byId.set(
      page.id,
      page
    );
  });

  return [...byId.values()];
}


function countBy(
  items,
  getKey
) {

  return items.reduce(
    (accumulator, item) => {

      const key =
        getKey(
          item
        ) || 'unknown';

      accumulator[key] =
        (accumulator[key] || 0) + 1;

      return accumulator;
    },
    {}
  );
}
