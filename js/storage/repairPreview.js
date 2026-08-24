import {
  createPageContentHash,
  parsePageRecordContent
} from '../core/pageRecord.js';

import {
  INTERNAL_LINK_REASONS,
  INTERNAL_LINK_TYPES,
  buildBrokenInternalLinkReport
} from './internalLinkDiagnostics.js';


export const REPAIR_PREVIEW_TYPES =
  Object.freeze({
    internalLinkTarget:
      'internal-link-target',
    relationshipTarget:
      'relationship-target'
  });

export const REPAIR_PREVIEW_STATUS =
  Object.freeze({
    empty:
      'empty',
    needsSelection:
      'needs-selection',
    ready:
      'ready',
    blocked:
      'blocked'
  });

export const REPAIR_PREVIEW_CONFLICTS =
  Object.freeze({
    diagnosticNotFound:
      'DIAGNOSTIC_NOT_FOUND',
    sourcePageMissing:
      'SOURCE_PAGE_MISSING',
    targetRequired:
      'TARGET_REQUIRED',
    targetNotFound:
      'TARGET_NOT_FOUND'
  });

const SUPPORTED_INTERNAL_REPAIR_REASONS =
  new Set([
    INTERNAL_LINK_REASONS.targetPageMissing,
    INTERNAL_LINK_REASONS.targetIdUnknown,
    INTERNAL_LINK_REASONS.relationEndpointMissing,
    INTERNAL_LINK_REASONS.malformedInternalReference,
    INTERNAL_LINK_REASONS.targetAmbiguous
  ]);

const PREVIEW_CONTEXT_RADIUS =
  80;


export function buildRepairPreviewModel({
  pages = [],
  internalLinkDiagnostics = null
} = {}) {

  const normalizedPages =
    normalizePages(
      pages
    );

  const pageById =
    new Map(
      normalizedPages.map(page => [
        page.id,
        page
      ])
    );

  const linkReport =
    internalLinkDiagnostics ||
    buildBrokenInternalLinkReport({
      pages
    });

  const diagnostics =
    (linkReport?.issues || [])
      .map((issue, issueIndex) =>
        createRepairPreviewDiagnostic({
          issue,
          issueIndex,
          pageById
        })
      )
      .filter(Boolean);

  const targets =
    normalizedPages
      .filter(page =>
        page.id
      )
      .map(page =>
        createTargetPageOption(
          page
        )
      )
      .sort(compareTargetOptions);

  return {
    status:
      diagnostics.length
        ? REPAIR_PREVIEW_STATUS.needsSelection
        : REPAIR_PREVIEW_STATUS.empty,
    previewOnly:
      true,
    summary: {
      supportedDiagnosticCount:
        diagnostics.length,
      targetCount:
        targets.length,
      unsupportedAssetReplacement:
        true
    },
    diagnostics,
    targets
  };
}


export function createRepairPreviewPlan({
  model = null,
  diagnosticId = '',
  targetPageId = ''
} = {}) {

  const diagnostic =
    (model?.diagnostics || []).find(candidate =>
      candidate.id === diagnosticId
    );

  if (!diagnostic) {

    return createBlockedRepairPreviewPlan({
      conflict:
        REPAIR_PREVIEW_CONFLICTS.diagnosticNotFound,
      message:
        'Диагностика не найдена. Обновите проверку и выберите проблему заново.'
    });
  }

  const sourceMissing =
    diagnostic.conflicts.some(conflict =>
      conflict.code === REPAIR_PREVIEW_CONFLICTS.sourcePageMissing
    );

  if (sourceMissing) {

    return createBlockedRepairPreviewPlan({
      diagnostic,
      conflict:
        REPAIR_PREVIEW_CONFLICTS.sourcePageMissing,
      message:
        'Исходная страница больше не найдена. Обновите диагностику.'
    });
  }

  if (!targetPageId) {

    return createBlockedRepairPreviewPlan({
      diagnostic,
      conflict:
        REPAIR_PREVIEW_CONFLICTS.targetRequired,
      message:
        'Нужно явно выбрать страницу-цель. MyOwnWorld не выбирает замену автоматически.'
    });
  }

  const target =
    (model?.targets || []).find(candidate =>
      candidate.id === targetPageId
    );

  if (!target) {

    return createBlockedRepairPreviewPlan({
      diagnostic,
      conflict:
        REPAIR_PREVIEW_CONFLICTS.targetNotFound,
      message:
        'Выбранная страница-цель не найдена в текущем workspace.'
    });
  }

  return {
    status:
      REPAIR_PREVIEW_STATUS.ready,
    previewOnly:
      true,
    id:
      `repair-preview:${diagnostic.id}:${target.id}`,
    source:
      diagnostic.source,
    diagnostic:
      diagnostic.diagnostic,
    action: {
      kind:
        diagnostic.action.kind,
      fieldPath:
        diagnostic.action.fieldPath,
      backupRequired:
        true,
      writesOnPreview:
        false
    },
    target,
    before:
      diagnostic.before,
    after:
      createAfterPreview(
        diagnostic,
        target
      ),
    staleEvidence:
      diagnostic.staleEvidence,
    conflicts:
      [],
    sideEffects: {
      pageWrites:
        0,
      assetWrites:
        0,
      assetDeletes:
        0,
      repositoryMutations:
        0,
      backupCreations:
        0
    }
  };
}


function createRepairPreviewDiagnostic({
  issue,
  issueIndex,
  pageById
}) {

  if (!isSupportedRepairIssue(issue)) return null;

  const sourcePage =
    pageById.get(
      issue.sourcePageId
    );

  const type =
    issue.linkType === INTERNAL_LINK_TYPES.relationship
      ? REPAIR_PREVIEW_TYPES.relationshipTarget
      : REPAIR_PREVIEW_TYPES.internalLinkTarget;

  const source =
    sourcePage
      ? createSourcePageSnapshot(
        sourcePage
      )
      : {
        id:
          issue.sourcePageId || '',
        title:
          issue.sourcePageTitle || 'Без названия'
      };

  const conflicts =
    sourcePage
      ? []
      : [
        {
          code:
            REPAIR_PREVIEW_CONFLICTS.sourcePageMissing,
          message:
            'Исходная страница не найдена в текущем workspace.'
        }
      ];

  return {
    id:
      `${issue.id}:${issueIndex}`,
    issueId:
      issue.id,
    type,
    label:
      createDiagnosticLabel(
        issue
      ),
    source,
    diagnostic: {
      category:
        issue.category || 'broken-internal-link',
      linkType:
        issue.linkType,
      reason:
        issue.reason,
      originalTarget:
        issue.originalTarget || '',
      targetId:
        issue.targetId || '',
      targetTitle:
        issue.targetTitle || '',
      displayText:
        issue.displayText || '',
      relationshipType:
        issue.relationshipType || '',
      candidateCount:
        issue.candidateCount || 0,
      owner:
        issue.owner || null
    },
    action:
      createPreviewAction(
        issue,
        type
      ),
    before:
      createBeforePreview(
        sourcePage,
        issue,
        type
      ),
    staleEvidence:
      createStaleEvidence(
        sourcePage,
        issue
      ),
    conflicts
  };
}


function isSupportedRepairIssue(
  issue
) {

  if (!issue?.linkType) return false;

  if (
    !SUPPORTED_INTERNAL_REPAIR_REASONS.has(
      issue.reason
    )
  ) {

    return false;
  }

  return issue.linkType === INTERNAL_LINK_TYPES.wiki ||
    issue.linkType === INTERNAL_LINK_TYPES.internalPage ||
    issue.linkType === INTERNAL_LINK_TYPES.relationship;
}


function createPreviewAction(
  issue,
  type
) {

  return {
    kind:
      type === REPAIR_PREVIEW_TYPES.relationshipTarget
        ? 'replace-relationship-target'
        : 'replace-internal-link-target',
    fieldPath:
      type === REPAIR_PREVIEW_TYPES.relationshipTarget
        ? `relationships[${Number(issue.index || 0)}]`
        : `body.${issue.linkType}[${Number(issue.index || 0)}]`,
    backupRequired:
      true
  };
}


function createBeforePreview(
  sourcePage,
  issue,
  type
) {

  return {
    targetId:
      issue.targetId || '',
    targetTitle:
      issue.targetTitle || issue.originalTarget || '',
    displayText:
      issue.displayText || '',
    relationshipType:
      issue.relationshipType || '',
    context:
      type === REPAIR_PREVIEW_TYPES.relationshipTarget
        ? createRelationshipContext(
          issue
        )
        : createTextContext(
          sourcePage,
          issue
        )
  };
}


function createAfterPreview(
  diagnostic,
  target
) {

  const before =
    diagnostic.before || {};

  return {
    targetId:
      target.id,
    targetTitle:
      target.title,
    displayText:
      before.displayText || target.title,
    relationshipType:
      before.relationshipType || '',
    context:
      diagnostic.type === REPAIR_PREVIEW_TYPES.relationshipTarget
        ? `${before.relationshipType || 'relationship'}: ${formatPreviewTarget(before)} -> ${target.title} (${target.id})`
        : createAfterTextContext(
          before.context,
          before.targetTitle ||
          before.targetId ||
          before.displayText,
          target.title
        )
  };
}


function createBlockedRepairPreviewPlan({
  diagnostic = null,
  conflict,
  message
}) {

  return {
    status:
      REPAIR_PREVIEW_STATUS.blocked,
    previewOnly:
      true,
    source:
      diagnostic?.source || null,
    diagnostic:
      diagnostic?.diagnostic || null,
    action:
      diagnostic?.action || null,
    before:
      diagnostic?.before || null,
    after:
      null,
    staleEvidence:
      diagnostic?.staleEvidence || null,
    conflicts: [
      {
        code:
          conflict,
        message
      }
    ],
    sideEffects: {
      pageWrites:
        0,
      assetWrites:
        0,
      assetDeletes:
        0,
      repositoryMutations:
        0,
      backupCreations:
        0
    }
  };
}


function normalizePages(
  pages
) {

  return (Array.isArray(pages) ? pages : [])
    .map(page =>
      normalizePageSnapshot(
        page
      )
    )
    .filter(page =>
      page.id
    );
}


function normalizePageSnapshot(
  page = {}
) {

  const parsed =
    parsePageSafely(
      page
    );

  const body =
    page.body ||
    parsed.rawBody ||
    parsed.body ||
    '';

  const content =
    page.content ||
    parsed.content ||
    body;

  return {
    id:
      page.id ||
      parsed.id ||
      '',
    title:
      page.title ||
      page.name ||
      parsed.title ||
      page.id ||
      'Без названия',
    type:
      page.type ||
      parsed.type ||
      '',
    template:
      page.template ||
      parsed.template ||
      '',
    aliases:
      [
        ...(page.aliases || parsed.aliases || [])
      ],
    body,
    content,
    relationships:
      (page.relationships || parsed.relationships || []).map(relationship => ({
        ...relationship
      })),
    updatedAt:
      page.updatedAt ||
      parsed.updatedAt ||
      null,
    contentHash:
      page.contentHash ||
      parsed.contentHash ||
      createPageContentHash(
        body
      ),
    revision:
      page.revision ||
      page.writeRevision ||
      null,
    contentLength:
      String(content || '').length
  };
}


function createSourcePageSnapshot(
  page
) {

  return {
    id:
      page.id,
    title:
      page.title || page.id || 'Без названия',
    type:
      page.type || '',
    template:
      page.template || ''
  };
}


function createTargetPageOption(
  page
) {

  return {
    id:
      page.id,
    title:
      page.title || page.id || 'Без названия',
    type:
      page.type || '',
    aliases:
      [
        ...(page.aliases || [])
      ]
  };
}


function createStaleEvidence(
  sourcePage,
  issue
) {

  if (!sourcePage) {

    return {
      sourcePageId:
        issue.sourcePageId || '',
      sourceMissing:
        true,
      diagnosticFingerprint:
        createDiagnosticFingerprint(
          issue
        )
    };
  }

  return {
    sourcePageId:
      sourcePage.id,
    sourceRevision:
      sourcePage.revision || null,
    sourceUpdatedAt:
      sourcePage.updatedAt || null,
    sourceContentHash:
      sourcePage.contentHash || null,
    sourceContentLength:
      sourcePage.contentLength,
    diagnosticFingerprint:
      createDiagnosticFingerprint(
        issue
      )
  };
}


function createDiagnosticFingerprint(
  issue
) {

  return [
    issue.sourcePageId || '',
    issue.linkType || '',
    issue.reason || '',
    issue.index ?? '',
    issue.originalTarget || issue.targetId || issue.targetTitle || ''
  ].join('|');
}


function createTextContext(
  sourcePage,
  issue
) {

  if (!sourcePage) return '';

  const text =
    normalizePreviewText(
      sourcePage.body ||
      sourcePage.content ||
      ''
    );

  const needle =
    [
      issue.originalTarget,
      issue.targetTitle,
      issue.targetId,
      issue.displayText
    ].find(value =>
      String(value || '').trim()
    ) || '';

  if (!text) return '';

  if (!needle) {

    return trimContext(
      text
    );
  }

  const index =
    text.toLowerCase()
      .indexOf(
        needle.toLowerCase()
      );

  if (index < 0) {

    return trimContext(
      text
    );
  }

  const start =
    Math.max(
      0,
      index - PREVIEW_CONTEXT_RADIUS
    );

  const end =
    Math.min(
      text.length,
      index + needle.length + PREVIEW_CONTEXT_RADIUS
    );

  return [
    start > 0
      ? '...'
      : '',
    text.slice(
      start,
      end
    ),
    end < text.length
      ? '...'
      : ''
  ].join('');
}


function createAfterTextContext(
  context,
  beforeTarget,
  afterTarget
) {

  const source =
    String(context || '');

  if (!source) return afterTarget || '';

  const needle =
    String(beforeTarget || '').trim();

  if (!needle) return source;

  const index =
    source.toLowerCase()
      .indexOf(
        needle.toLowerCase()
      );

  if (index < 0) return source;

  return `${source.slice(0, index)}${afterTarget}${source.slice(index + needle.length)}`;
}


function createRelationshipContext(
  issue
) {

  return `${issue.relationshipType || 'relationship'}: ${formatPreviewTarget(issue)}`;
}


function formatPreviewTarget(
  value = {}
) {

  return value.targetTitle ||
    value.originalTarget ||
    value.targetId ||
    value.displayText ||
    'цель не указана';
}


function createDiagnosticLabel(
  issue
) {

  return [
    issue.sourcePageTitle ||
    issue.sourcePageId ||
    'Без названия',
    formatIssueLinkType(
      issue.linkType
    ),
    formatPreviewTarget(
      issue
    ),
    issue.candidateCount
      ? `${issue.candidateCount} совпадения`
      : ''
  ]
    .filter(Boolean)
    .join(' · ');
}


function formatIssueLinkType(
  linkType
) {

  if (linkType === INTERNAL_LINK_TYPES.relationship) return 'отношение';
  if (linkType === INTERNAL_LINK_TYPES.internalPage) return 'page-ссылка';
  if (linkType === INTERNAL_LINK_TYPES.wiki) return 'wiki-ссылка';

  return 'внутренняя ссылка';
}


function normalizePreviewText(
  value
) {

  return decodeHTMLEntities(
    String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}


function trimContext(
  text
) {

  const value =
    String(text || '');

  if (value.length <= PREVIEW_CONTEXT_RADIUS * 2) return value;

  return `${value.slice(0, PREVIEW_CONTEXT_RADIUS * 2)}...`;
}


function parsePageSafely(
  page
) {

  try {

    return parsePageRecordContent(
      page?.content ||
      page?.body ||
      ''
    );

  } catch {

    return {
      id:
        page?.id || '',
      title:
        page?.title || page?.name || page?.id || 'Без названия',
      body:
        page?.body || '',
      rawBody:
        page?.body || '',
      content:
        page?.content || page?.body || '',
      relationships:
        Array.isArray(page?.relationships)
          ? page.relationships
          : []
    };
  }
}


function decodeHTMLEntities(
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


function compareTargetOptions(
  left,
  right
) {

  return left.title.localeCompare(
    right.title,
    'ru'
  ) ||
    left.id.localeCompare(
      right.id,
      'ru'
    );
}
