import {
  ASSET_VERIFICATION_CATEGORIES
} from './assetVerificationReport.js';

import {
  INTERNAL_LINK_TYPES
} from './internalLinkDiagnostics.js';


export const ORPHAN_REVIEW_TYPES =
  Object.freeze({
    assetUnused:
      'asset-unused',
    internalReferenceTarget:
      'internal-reference-target',
    relationshipTarget:
      'relationship-target',
    pageParentMissing:
      'page-parent-missing',
    schemaDisconnectedRecord:
      'schema-disconnected-record'
  });


export const ORPHAN_REVIEW_CLASSIFICATIONS =
  Object.freeze({
    diagnostic:
      'diagnostic',
    schemaError:
      'schema-error'
  });


const SCHEMA_DISCONNECTED_CODES =
  new Map([
    [
      'page.broken_parent',
      {
        type:
          ORPHAN_REVIEW_TYPES.pageParentMissing,
        reason:
          'PARENT_PAGE_MISSING',
        label:
          'Страница вне дерева',
        why:
          'Страница указывает родителя, которого нет в текущем workspace.'
      }
    ],
    [
      'page.parent_cycle',
      {
        type:
          ORPHAN_REVIEW_TYPES.schemaDisconnectedRecord,
        reason:
          'PARENT_CHAIN_CYCLE',
        label:
          'Цикл в дереве',
        why:
          'Parent-chain страницы образует цикл и требует проверки структуры.'
      }
    ],
    [
      'map.token_missing_page',
      {
        type:
          ORPHAN_REVIEW_TYPES.schemaDisconnectedRecord,
        reason:
          'MAP_TOKEN_PAGE_MISSING',
        label:
          'Токен без карточки',
        why:
          'Persistent-токен карты не связан с существующей страницей.'
      }
    ],
    [
      'task.column_broken_task_ref',
      {
        type:
          ORPHAN_REVIEW_TYPES.schemaDisconnectedRecord,
        reason:
          'TASK_REFERENCE_MISSING',
        label:
          'Ссылка task tracker',
        why:
          'Колонка task tracker содержит ссылку на задачу, которой нет в модели.'
      }
    ]
  ]);

const ORPHAN_REVIEW_VISIBLE_ROWS =
  8;


export function buildOrphanReviewReport({
  assetVerification = null,
  internalLinkDiagnostics = null,
  schema = null
} = {}) {

  const candidates =
    [
      ...createAssetUnusedCandidates(
        assetVerification
      ),
      ...createInternalReferenceCandidates(
        internalLinkDiagnostics
      ),
      ...createSchemaDisconnectedCandidates(
        schema
      )
    ];

  const groups =
    groupOrphanReviewCandidates(
      candidates
    );

  return {
    status:
      candidates.length
        ? 'needs-review'
        : 'ok',
    summary:
      createOrphanReviewSummary(
        candidates,
        groups
      ),
    candidates,
    groups
  };
}


function createAssetUnusedCandidates(
  assetVerification
) {

  return (assetVerification?.orphanCandidates || [])
    .filter(candidate =>
      candidate?.category === ASSET_VERIFICATION_CATEGORIES.orphanCandidate
    )
    .map(candidate =>
      createOrphanReviewCandidate({
        type:
          ORPHAN_REVIEW_TYPES.assetUnused,
        classification:
          ORPHAN_REVIEW_CLASSIFICATIONS.diagnostic,
        reason:
          'ASSET_NOT_CURRENTLY_REFERENCED',
        item:
          candidate.path,
        why:
          'Файл assets существует, но текущие persistent-ссылки на него не найдены.',
        sourceReferenceCount:
          0,
        source:
          null,
        details: {
          path:
            candidate.path
        }
      })
    );
}


function createInternalReferenceCandidates(
  internalLinkDiagnostics
) {

  return (internalLinkDiagnostics?.issues || [])
    .map(issue => {

      const relationship =
        issue.linkType === INTERNAL_LINK_TYPES.relationship;

      return createOrphanReviewCandidate({
        type:
          relationship
            ? ORPHAN_REVIEW_TYPES.relationshipTarget
            : ORPHAN_REVIEW_TYPES.internalReferenceTarget,
        classification:
          ORPHAN_REVIEW_CLASSIFICATIONS.diagnostic,
        reason:
          issue.reason,
        item:
          issue.originalTarget ||
          issue.targetTitle ||
          issue.targetId ||
          'цель не указана',
        why:
          relationship
            ? 'Цель отношения не найдена или не может быть однозначно определена.'
            : 'Цель внутренней ссылки не найдена или не может быть однозначно определена.',
        sourceReferenceCount:
          1,
        source: {
          pageId:
            issue.sourcePageId || '',
          pageTitle:
            issue.sourcePageTitle || '',
          linkType:
            issue.linkType,
          relationshipType:
            issue.relationshipType || ''
        },
        details: {
          targetId:
            issue.targetId || '',
          targetTitle:
            issue.targetTitle || '',
          displayText:
            issue.displayText || '',
          candidateCount:
            issue.candidateCount || 0
        }
      });
    });
}


function createSchemaDisconnectedCandidates(
  schema
) {

  return (schema?.issues || [])
    .filter(issue =>
      SCHEMA_DISCONNECTED_CODES.has(
        issue?.code
      )
    )
    .map(issue => {

      const config =
        SCHEMA_DISCONNECTED_CODES.get(
          issue.code
        );

      return createOrphanReviewCandidate({
        type:
          config.type,
        classification:
          ORPHAN_REVIEW_CLASSIFICATIONS.schemaError,
        reason:
          config.reason,
        item:
          createSchemaIssueItem(
            issue
          ),
        why:
          config.why,
        sourceReferenceCount:
          1,
        source: {
          pageId:
            issue.details?.pageId || '',
          pageTitle:
            issue.details?.pageTitle || '',
          schemaCode:
            issue.code
        },
        details: {
          ...issue.details,
          severity:
            issue.severity,
          label:
            config.label
        }
      });
    });
}


function createSchemaIssueItem(
  issue
) {

  const details =
    issue?.details || {};

  return details.pageId ||
    details.tokenId ||
    details.taskId ||
    details.columnId ||
    details.parent ||
    issue?.code ||
    'schema issue';
}


function createOrphanReviewCandidate({
  type,
  classification,
  reason,
  item,
  why,
  sourceReferenceCount = null,
  source = null,
  details = {}
}) {

  return {
    category:
      'orphan-review',
    id:
      [
        type,
        classification,
        reason,
        item,
        source?.pageId || source?.schemaCode || ''
      ].join(':'),
    type,
    classification,
    reason,
    item:
      String(item || ''),
    why,
    sourceReferenceCount,
    source,
    details
  };
}


function groupOrphanReviewCandidates(
  candidates
) {

  const groups =
    new Map();

  candidates.forEach(candidate => {

    const key =
      [
        candidate.type,
        candidate.classification
      ].join(':');

    if (!groups.has(key)) {

      groups.set(
        key,
        {
          type:
            candidate.type,
          label:
            getOrphanReviewTypeLabel(
              candidate.type
            ),
          classification:
            candidate.classification,
          count:
            0,
          schemaErrorCount:
            0,
          diagnosticCount:
            0,
          reasons:
            {},
          examples:
            []
        }
      );
    }

    const group =
      groups.get(
        key
      );

    group.count +=
      1;

    if (candidate.classification === ORPHAN_REVIEW_CLASSIFICATIONS.schemaError) {

      group.schemaErrorCount +=
        1;

    } else {

      group.diagnosticCount +=
        1;
    }

    group.reasons[candidate.reason] =
      (group.reasons[candidate.reason] || 0) + 1;

    if (
      group.examples.length < ORPHAN_REVIEW_VISIBLE_ROWS
    ) {

      group.examples.push(
        candidate
      );
    }
  });

  return [...groups.values()]
    .sort((left, right) =>
      getOrphanReviewTypePriority(
        left.type
      ) -
      getOrphanReviewTypePriority(
        right.type
      ) ||
      left.label.localeCompare(
        right.label
      )
    );
}


function createOrphanReviewSummary(
  candidates,
  groups
) {

  return {
    candidateCount:
      candidates.length,
    groupCount:
      groups.length,
    diagnosticCount:
      candidates.filter(candidate =>
        candidate.classification === ORPHAN_REVIEW_CLASSIFICATIONS.diagnostic
      ).length,
    schemaErrorCount:
      candidates.filter(candidate =>
        candidate.classification === ORPHAN_REVIEW_CLASSIFICATIONS.schemaError
      ).length,
    byType:
      countBy(
        candidates,
        candidate =>
          candidate.type
      )
  };
}


function getOrphanReviewTypeLabel(
  type
) {

  const labels =
    {
      [ORPHAN_REVIEW_TYPES.assetUnused]:
        'Assets не используются сейчас',
      [ORPHAN_REVIEW_TYPES.internalReferenceTarget]:
        'Внутренние ссылки',
      [ORPHAN_REVIEW_TYPES.relationshipTarget]:
        'Отношения',
      [ORPHAN_REVIEW_TYPES.pageParentMissing]:
        'Дерево страниц',
      [ORPHAN_REVIEW_TYPES.schemaDisconnectedRecord]:
        'Schema-связи'
    };

  return labels[type] ||
    'Проверка связности';
}


function getOrphanReviewTypePriority(
  type
) {

  const priorities =
    {
      [ORPHAN_REVIEW_TYPES.pageParentMissing]:
        10,
      [ORPHAN_REVIEW_TYPES.relationshipTarget]:
        20,
      [ORPHAN_REVIEW_TYPES.internalReferenceTarget]:
        30,
      [ORPHAN_REVIEW_TYPES.assetUnused]:
        40,
      [ORPHAN_REVIEW_TYPES.schemaDisconnectedRecord]:
        50
    };

  return priorities[type] ||
    1000;
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
