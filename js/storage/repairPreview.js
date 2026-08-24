import {
  createPageContentHash,
  parsePageRecordContent,
  updatePageRecordContent
} from '../core/pageRecord.js';

import {
  persistKnowledgeGraphRelationshipsCommand
} from '../wiki/knowledgeGraphCommandBridge.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from './pageCommandService.js';

import {
  requireWorkspaceBackupBeforeRiskyOperation
} from './backupService.js';

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
      'TARGET_NOT_FOUND',
    staleSource:
      'STALE_SOURCE',
    unsupportedRepair:
      'UNSUPPORTED_REPAIR',
    contentLocatorMissing:
      'CONTENT_LOCATOR_MISSING'
  });

export const REPAIR_APPLY_STATUS =
  Object.freeze({
    applied:
      'applied',
    blocked:
      'blocked',
    failed:
      'failed'
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

const HTML_ANCHOR_PATTERN =
  /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

const WIKI_LINK_PATTERN =
  /\[\[([^\]]+)\]\]/g;


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


export async function applyRepairPreviewPlan({
  plan = null,
  pages = [],
  createSafetyBackup = createDefaultRepairSafetyBackup,
  persistContentCommand = persistPageContentCommand,
  persistRelationshipsCommand = persistKnowledgeGraphRelationshipsCommand,
  onProgress = null
} = {}) {

  assertReadyRepairPlan(
    plan
  );

  const sourcePage =
    findPageById(
      pages,
      plan.source?.id
    );

  assertRepairPlanCurrent({
    plan,
    sourcePage
  });

  let backupManifest;

  try {

    backupManifest =
      await createSafetyBackup({
        reason:
          'repair-preview-apply',
        plan,
        onProgress
      });

  } catch (error) {

    throw createRepairApplyError({
      code:
        'BACKUP_FAILED',
      message:
        `Резервная копия не создана: ${error?.message || error}`,
      cause:
        error
    });
  }

  try {

    const commandResult =
      plan.action?.kind === 'replace-relationship-target'
        ? await applyRelationshipTargetRepair({
          plan,
          sourcePage,
          persistRelationshipsCommand
        })
        : await applyInternalLinkTargetRepair({
          plan,
          sourcePage,
          persistContentCommand
        });

    const diagnostics =
      buildBrokenInternalLinkReport({
        pages
      });

    return {
      status:
        REPAIR_APPLY_STATUS.applied,
      pageId:
        sourcePage.id,
      backupManifest,
      commandResult,
      diagnostics
    };

  } catch (error) {

    throw createRepairApplyError({
      code:
        'REPAIR_WRITE_FAILED',
      message:
        `Repair не применен полностью: ${error?.message || error}`,
      backupManifest,
      cause:
        error
    });
  }
}


function assertReadyRepairPlan(
  plan
) {

  if (
    plan?.status !== REPAIR_PREVIEW_STATUS.ready ||
    !plan?.source?.id ||
    !plan?.target?.id ||
    !plan?.action?.kind
  ) {

    throw createRepairApplyError({
      code:
        REPAIR_PREVIEW_CONFLICTS.unsupportedRepair,
      message:
        'Применять можно только готовый repair preview plan.'
    });
  }
}


function assertRepairPlanCurrent({
  plan,
  sourcePage
}) {

  if (!sourcePage?.id) {

    throw createRepairApplyError({
      code:
        REPAIR_PREVIEW_CONFLICTS.sourcePageMissing,
      message:
        'Исходная страница больше не найдена. Обновите диагностику.'
    });
  }

  const current =
    normalizePageSnapshot(
      sourcePage
    );

  const evidence =
    plan.staleEvidence || {};

  const mismatches =
    [];

  if (
    evidence.sourceContentHash &&
    current.contentHash !== evidence.sourceContentHash
  ) {

    mismatches.push(
      'contentHash'
    );
  }

  if (
    evidence.sourceUpdatedAt &&
    current.updatedAt !== evidence.sourceUpdatedAt
  ) {

    mismatches.push(
      'updatedAt'
    );
  }

  if (
    Number.isFinite(
      Number(evidence.sourceContentLength)
    ) &&
    Number(current.contentLength) !== Number(evidence.sourceContentLength)
  ) {

    mismatches.push(
      'contentLength'
    );
  }

  if (
    evidence.sourceRevision &&
    current.revision &&
    evidence.sourceRevision !== current.revision
  ) {

    mismatches.push(
      'revision'
    );
  }

  if (mismatches.length) {

    throw createRepairApplyError({
      code:
        REPAIR_PREVIEW_CONFLICTS.staleSource,
      message:
        `Preview устарел (${mismatches.join(', ')}). Обновите диагностику и создайте план заново.`,
      details: {
        mismatches
      }
    });
  }
}


async function applyInternalLinkTargetRepair({
  plan,
  sourcePage,
  persistContentCommand
}) {

  const parsed =
    parsePageSafely(
      sourcePage
    );

  const currentBody =
    parsed.rawBody ||
    sourcePage.body ||
    '';

  const nextBody =
    replaceInternalLinkTargetInBody({
      body:
        currentBody,
      plan
    });

  if (nextBody === currentBody) {

    throw createRepairApplyError({
      code:
        REPAIR_PREVIEW_CONFLICTS.contentLocatorMissing,
      message:
        'Не удалось найти ссылку, описанную preview plan.'
    });
  }

  const nextContent =
    updatePageRecordContent(
      sourcePage.content || currentBody,
      {
        body:
          nextBody
      }
    );

  const result =
    await persistContentCommand({
      page:
        sourcePage,
      content:
        nextContent,
      previousPage:
        snapshotPageForCommand(
          sourcePage
        ),
      type:
        'repair-internal-link-target',
      reason:
        'repair-preview-apply'
    });

  assertRepairCommandResultDurable(
    result
  );

  syncRuntimePageFromContent(
    sourcePage,
    nextContent
  );

  return result;
}


async function applyRelationshipTargetRepair({
  plan,
  sourcePage,
  persistRelationshipsCommand
}) {

  const relationships =
    Array.isArray(sourcePage.relationships)
      ? sourcePage.relationships.map(relationship => ({
        ...relationship
      }))
      : [];

  const index =
    Number(
      plan.action?.locator?.index ??
      parseFieldPathIndex(
        plan.action?.fieldPath
      )
    );

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= relationships.length
  ) {

    throw createRepairApplyError({
      code:
        REPAIR_PREVIEW_CONFLICTS.contentLocatorMissing,
      message:
        'Не удалось найти relationship, описанный preview plan.'
    });
  }

  relationships[index] =
    normalizeRelationshipRepairTarget({
      relationship:
        relationships[index],
      target:
        plan.target
    });

  const beforeContent =
    sourcePage.content;

  const beforeRelationships =
    Array.isArray(sourcePage.relationships)
      ? sourcePage.relationships.map(relationship => ({
        ...relationship
      }))
      : [];

  const result =
    await persistRelationshipsCommand({
      page:
        sourcePage,
      relationships,
      reason:
        'repair-preview-apply'
    });

  try {

    assertRepairCommandResultDurable(
      result
    );

  } catch (error) {

    sourcePage.content =
      beforeContent;

    sourcePage.relationships =
      beforeRelationships;

    throw error;
  }

  syncRuntimePageFromContent(
    sourcePage,
    sourcePage.content
  );

  return result;
}


function assertRepairCommandResultDurable(
  result
) {

  const writeStatus =
    result?.writeStatus || '';

  if (
    result?.stale === true ||
    result?.written === false ||
    writeStatus === 'stale' ||
    writeStatus === 'superseded' ||
    writeStatus === 'superseded-after-write'
  ) {

    throw createRepairApplyError({
      code:
        'REPAIR_WRITE_NOT_DURABLE',
      message:
        'Repair command did not become the durable page revision.'
    });
  }
}


function replaceInternalLinkTargetInBody({
  body,
  plan
}) {

  const locatorKind =
    plan.action?.locator?.kind || '';

  if (locatorKind === 'raw-wiki') {

    return replaceRawWikiLinkTarget(
      body,
      plan
    );
  }

  if (locatorKind === 'html-anchor') {

    return replaceAnchorLinkTarget(
      body,
      plan
    );
  }

  const anchorResult =
    replaceAnchorLinkTarget(
      body,
      plan,
      {
        optional:
          true
      }
    );

  if (anchorResult !== body) return anchorResult;

  return replaceRawWikiLinkTarget(
    body,
    plan
  );
}


function replaceRawWikiLinkTarget(
  body,
  plan
) {

  const targetIndex =
    Number(
      plan.action?.locator?.index ?? 0
    );

  let currentIndex =
    0;

  let replaced =
    false;

  WIKI_LINK_PATTERN.lastIndex =
    0;

  const nextBody =
    String(body || '').replace(
      WIKI_LINK_PATTERN,
      (match, expression) => {

        const index =
          currentIndex;

        currentIndex +=
          1;

        if (index !== targetIndex) return match;

        replaced =
          true;

        const parts =
          String(expression || '')
            .split('|');

        const label =
          parts[1]?.trim() ||
          plan.before?.displayText ||
          '';

        if (
          label &&
          label !== parts[0]?.trim()
        ) {

          return `[[${plan.target.title}|${label}]]`;
        }

        return `[[${plan.target.title}]]`;
      }
    );

  if (!replaced) {

    throw createRepairApplyError({
      code:
        REPAIR_PREVIEW_CONFLICTS.contentLocatorMissing,
      message:
        'Не удалось найти wiki-ссылку, описанную preview plan.'
    });
  }

  return nextBody;
}


function replaceAnchorLinkTarget(
  body,
  plan,
  options = {}
) {

  let currentIndex =
    0;

  let replaced =
    false;

  HTML_ANCHOR_PATTERN.lastIndex =
    0;

  const nextBody =
    String(body || '').replace(
      HTML_ANCHOR_PATTERN,
      (match, attrsText, innerHTML) => {

        const reference =
          createAnchorReferenceInfo({
            attrsText,
            innerHTML,
            index:
              currentIndex
          });

        if (!reference) return match;

        currentIndex +=
          1;

        if (
          reference.linkType !== plan.diagnostic?.linkType ||
          reference.index !== Number(plan.action?.locator?.index ?? 0)
        ) {

          return match;
        }

        replaced =
          true;

        const nextAttrs =
          upsertAnchorTargetAttributes(
            attrsText,
            plan.target
          );

        return `<a${nextAttrs}>${innerHTML}</a>`;
      }
    );

  if (!replaced && !options.optional) {

    throw createRepairApplyError({
      code:
        REPAIR_PREVIEW_CONFLICTS.contentLocatorMissing,
      message:
        'Не удалось найти HTML-ссылку, описанную preview plan.'
    });
  }

  return nextBody;
}


function createAnchorReferenceInfo({
  attrsText,
  innerHTML,
  index
}) {

  const attrs =
    parseHTMLAttributes(
      attrsText
    );

  const classNames =
    new Set(
      String(attrs.class || '')
        .split(/\s+/)
        .filter(Boolean)
    );

  const href =
    String(attrs.href || '').trim();

  const hasPageTarget =
    Boolean(
      attrs['data-page-id'] ||
      attrs['data-page-title']
    );

  const isWikiLink =
    classNames.has(
      'wiki-link'
    );

  if (isWikiLink) {

    return {
      index,
      linkType:
        INTERNAL_LINK_TYPES.wiki,
      displayText:
        getPlainText(
          innerHTML
        )
    };
  }

  const isInternalLink =
    classNames.has(
      'internal-link'
    );

  if (
    !hasPageTarget &&
    !isInternalLink
  ) {

    return null;
  }

  if (
    !hasPageTarget &&
    /^(?:https?:|mailto:|tel:|file:|blob:|data:)/i.test(
      href
    )
  ) {

    return null;
  }

  return {
    index,
    linkType:
      INTERNAL_LINK_TYPES.internalPage,
    displayText:
      getPlainText(
        innerHTML
      )
  };
}


function upsertAnchorTargetAttributes(
  attrsText,
  target
) {

  let nextAttrs =
    removeMissingClass(
      String(attrsText || '')
    );

  nextAttrs =
    upsertHTMLAttribute(
      nextAttrs,
      'data-page-id',
      target.id
    );

  nextAttrs =
    upsertHTMLAttribute(
      nextAttrs,
      'data-page-title',
      target.title
    );

  return nextAttrs;
}


function upsertHTMLAttribute(
  attrsText,
  name,
  value
) {

  const escaped =
    escapeHTMLAttribute(
      value
    );

  const pattern =
    new RegExp(
      `(${escapeRegExp(name)}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s"'=<>` + '`' + `]+)`,
      'i'
    );

  if (
    pattern.test(
      attrsText
    )
  ) {

    return attrsText.replace(
      pattern,
      `$1"${escaped}"`
    );
  }

  const trimmed =
    attrsText.trimEnd();

  return `${trimmed} ${name}="${escaped}"`;
}


function removeMissingClass(
  attrsText
) {

  return String(attrsText || '').replace(
    /\bclass\s*=\s*(["'])(.*?)\1/i,
    (match, quote, classText) => {

      const nextClassText =
        String(classText || '')
          .split(/\s+/)
          .filter(className =>
            className &&
            className !== 'is-missing'
          )
          .join(' ');

      return nextClassText
        ? `class=${quote}${nextClassText}${quote}`
        : '';
    }
  );
}


function normalizeRelationshipRepairTarget({
  relationship,
  target
}) {

  return {
    ...relationship,
    targetId:
      target.id,
    targetTitle:
      target.title
  };
}


function syncRuntimePageFromContent(
  page,
  content
) {

  if (!page || typeof content !== 'string') return;

  const parsed =
    parsePageRecordContent(
      content
    );

  page.content =
    content;

  page.body =
    parsed.rawBody || parsed.body || '';

  page.updatedAt =
    parsed.updatedAt || page.updatedAt || null;

  page.contentHash =
    parsed.pageRecordStatus?.expectedContentHash ||
    parsed.contentHash ||
    page.contentHash ||
    null;

  page.relationships =
    parsed.relationships;
}


function findPageById(
  pages,
  id
) {

  return (Array.isArray(pages) ? pages : [])
    .find(page =>
      page?.id === id
    );
}


async function createDefaultRepairSafetyBackup({
  reason,
  onProgress
} = {}) {

  return requireWorkspaceBackupBeforeRiskyOperation(
    reason || 'repair-preview-apply',
    {
      onProgress
    }
  );
}


function createRepairApplyError({
  code,
  message,
  backupManifest = null,
  details = null,
  cause = null
}) {

  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.repairApplyStatus =
    code === REPAIR_PREVIEW_CONFLICTS.staleSource ||
    code === REPAIR_PREVIEW_CONFLICTS.sourcePageMissing ||
    code === REPAIR_PREVIEW_CONFLICTS.unsupportedRepair ||
    code === REPAIR_PREVIEW_CONFLICTS.contentLocatorMissing
      ? REPAIR_APPLY_STATUS.blocked
      : REPAIR_APPLY_STATUS.failed;

  error.backupManifest =
    backupManifest;

  error.details =
    details;

  if (cause) {

    error.cause =
      cause;
  }

  return error;
}


function parseFieldPathIndex(
  fieldPath
) {

  const match =
    String(fieldPath || '').match(
      /\[(\d+)\]/
    );

  return match
    ? Number(match[1])
    : NaN;
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
      locator:
        issue.locator || null,
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
    locator:
      issue.locator || {
        kind:
          type === REPAIR_PREVIEW_TYPES.relationshipTarget
            ? 'relationship'
            : issue.linkType,
        index:
          Number(issue.index || 0),
        linkType:
          issue.linkType
      },
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
      parsed.updatedAt ||
      page.updatedAt ||
      null,
    contentHash:
      parsed.pageRecordStatus?.expectedContentHash ||
      parsed.contentHash ||
      page.contentHash ||
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
    issue.locator?.kind || '',
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
      decodeHTMLEntities(
        match[2] ??
        match[3] ??
        match[4] ??
        ''
      );
  }

  return attrs;
}


function getPlainText(
  html
) {

  return decodeHTMLEntities(
    String(html || '')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}


function escapeHTMLAttribute(
  value
) {

  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function escapeRegExp(
  value
) {

  return String(value || '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
