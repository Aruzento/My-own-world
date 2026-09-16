import {
  applyCharacterHealthChange,
  getCharacterHealth,
  readCharacterModelFromPage
} from '../character/characterModel.js';

import {
  readPropertiesModelFromElement
} from './propertiesModel.js';

import {
  setPropertyFieldValue
} from './propertiesDomWriter.js';

import {
  snapshotPageForCommand
} from '../storage/pageCommandService.js';

import {
  evaluatePageWritePrecondition
} from '../storage/pageWritePreconditions.js';


export const CHARACTER_HEALTH_MUTATION_PLAN_KIND =
  'CharacterHealthMutationPlan';

export const CHARACTER_HEALTH_MUTATION_VERSION =
  1;

export const CHARACTER_HEALTH_MUTATION_TYPES =
  Object.freeze({
    DELTA:
      'delta',
    EXACT:
      'exact'
  });

export const CHARACTER_HEALTH_MUTATION_ERROR_CODES =
  Object.freeze({
    INVALID_PAGE:
      'CHARACTER_HEALTH_INVALID_PAGE',
    INVALID_REQUEST:
      'CHARACTER_HEALTH_INVALID_REQUEST',
    PRECONDITION_FAILED:
      'CHARACTER_HEALTH_PRECONDITION_FAILED',
    SOURCE_MISSING:
      'CHARACTER_HEALTH_SOURCE_MISSING',
    SOURCE_UNSUPPORTED:
      'CHARACTER_HEALTH_SOURCE_UNSUPPORTED',
    SOURCE_AMBIGUOUS:
      'CHARACTER_HEALTH_SOURCE_AMBIGUOUS',
    FIELD_MISSING:
      'CHARACTER_HEALTH_FIELD_MISSING',
    FIELD_DUPLICATE:
      'CHARACTER_HEALTH_FIELD_DUPLICATE',
    FIELD_INVALID:
      'CHARACTER_HEALTH_FIELD_INVALID',
    HEALTH_INVALID:
      'CHARACTER_HEALTH_STATE_INVALID',
    INPUT_CHANGED:
      'CHARACTER_HEALTH_INPUT_CHANGED',
    READBACK_FAILED:
      'CHARACTER_HEALTH_READBACK_FAILED'
  });


const HEALTH_FIELDS =
  Object.freeze([
    'hpCurrent',
    'hpMax',
    'hpTemp'
  ]);

const MUTABLE_HEALTH_FIELDS =
  Object.freeze([
    'hpTemp',
    'hpCurrent'
  ]);

const SUPPORTED_CARD_TYPES =
  new Set([
    'character',
    'creature'
  ]);


export class CharacterHealthMutationError extends Error {

  constructor(
    message,
    {
      code =
        CHARACTER_HEALTH_MUTATION_ERROR_CODES.INVALID_REQUEST,
      pageId =
        '',
      field =
        '',
      reason =
        '',
      details =
        null
    } = {}
  ) {

    super(
      message
    );

    this.name =
      'CharacterHealthMutationError';

    this.code =
      code;

    this.pageId =
      pageId;

    this.field =
      field;

    this.reason =
      reason;

    this.details =
      details === null
        ? null
        : deepFreeze(
          clonePlainData(
            details
          )
        );
  }
}


export async function prepareCharacterHealthMutation(
  page,
  request = {},
  options = {}
) {

  assertPage(
    page
  );

  const normalizedRequest =
    normalizeRequest(
      request,
      page.id
    );

  const baseContent =
    page.content;

  const detachedPage =
    clonePage(
      page,
      baseContent
    );

  const previousPage =
    snapshotPageForCommand(
      detachedPage
    );

  const precondition =
    await evaluatePageWritePrecondition({
      page:
        detachedPage,
      expectedBase:
        previousPage.pageStateIdentity,
      storageAdapter:
        options.storageAdapter || null
    });

  if (precondition.ok !== true) {

    throw new CharacterHealthMutationError(
      'Character health preparation requires the runtime page to match its current durable base.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.PRECONDITION_FAILED,
        pageId:
          page.id,
        reason:
          precondition.status || 'precondition-failed',
        details: {
          precondition
        }
      }
    );
  }

  if (page.content !== baseContent) {

    throw new CharacterHealthMutationError(
      'Character health input changed while its durable base was being checked.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.INPUT_CHANGED,
        pageId:
          page.id,
        reason:
          'runtime-content-changed'
      }
    );
  }

  const beforeInspection =
    inspectWritableHealthSource(
      baseContent,
      page.id
    );

  const beforeCharacter =
    readCharacterModelFromPage(
      detachedPage,
      {
        pages:
          options.pages || []
      }
    );

  assertCharacterMatchesSource(
    beforeCharacter,
    beforeInspection,
    page.id,
    'before'
  );

  const before =
    readHealthTuple(
      beforeInspection,
      page.id
    );

  const after =
    resolveAfterHealth({
      request:
        normalizedRequest,
      character:
        beforeCharacter,
      before,
      pageId:
        page.id
    });

  const changedFields =
    MUTABLE_HEALTH_FIELDS
      .filter(field =>
        before[field] !== after[field]
      )
      .map(field => ({
        field,
        before:
          before[field],
        after:
          after[field]
      }));

  const changed =
    changedFields.length > 0;

  const nextContent =
    changed
      ? createNextContent({
        content:
          baseContent,
        inspection:
          beforeInspection,
        after,
        pageId:
          page.id
      })
      : baseContent;

  const afterInspection =
    inspectWritableHealthSource(
      nextContent,
      page.id
    );

  const afterPage =
    clonePage(
      detachedPage,
      nextContent
    );

  const afterCharacter =
    readCharacterModelFromPage(
      afterPage,
      {
        pages:
          options.pages || []
      }
    );

  assertReadback({
    pageId:
      page.id,
    beforeInspection,
    afterInspection,
    beforeCharacter,
    afterCharacter,
    before,
    after,
    originalContent:
      baseContent,
    nextContent
  });

  if (page.content !== baseContent) {

    throw new CharacterHealthMutationError(
      'Character health preparation mutated or lost its original page input.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.INPUT_CHANGED,
        pageId:
          page.id,
        reason:
          'runtime-content-changed'
      }
    );
  }

  const unchangedFields =
    HEALTH_FIELDS
      .filter(field =>
        before[field] === after[field]
      )
      .map(field => ({
        field,
        value:
          before[field]
      }));

  return deepFreeze({
    kind:
      CHARACTER_HEALTH_MUTATION_PLAN_KIND,
    version:
      CHARACTER_HEALTH_MUTATION_VERSION,
    pageId:
      page.id,
    source: {
      kind:
        'properties',
      cardType:
        beforeInspection.cardType
    },
    request:
      normalizedRequest,
    expectedBase:
      precondition.expectedBase,
    previousPage,
    nextContent,
    before,
    after,
    changed,
    changedFields,
    guards: {
      hpMax:
        before.hpMax,
      unchangedFields
    }
  });
}


function inspectWritableHealthSource(
  content,
  pageId
) {

  if (typeof document === 'undefined') {

    throw new CharacterHealthMutationError(
      'Character health preparation requires the Properties DOM reader.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.SOURCE_UNSUPPORTED,
        pageId,
        reason:
          'dom-unavailable'
      }
    );
  }

  const wrapper =
    createBodyWrapper(
      content
    );

  const candidates =
    [
      ...wrapper.querySelectorAll(
        '.card-properties-block[data-block-type="properties"][data-card-type="character"], .card-properties-block[data-block-type="properties"][data-card-type="creature"]'
      )
    ];

  if (candidates.length === 0) {

    const legacyOnly =
      Boolean(
        wrapper.querySelector(
          '.dnd-stats-block'
        )
      );

    throw new CharacterHealthMutationError(
      legacyOnly
        ? 'Legacy-only Character health is not a writable Phase 17 source.'
        : 'A Properties-backed Character or Creature health source is required.',
      {
        code:
          legacyOnly
            ? CHARACTER_HEALTH_MUTATION_ERROR_CODES.SOURCE_UNSUPPORTED
            : CHARACTER_HEALTH_MUTATION_ERROR_CODES.SOURCE_MISSING,
        pageId,
        reason:
          legacyOnly
            ? 'legacy-only'
            : 'properties-source-missing'
      }
    );
  }

  if (candidates.length !== 1) {

    throw new CharacterHealthMutationError(
      'Character health preparation requires exactly one writable Character or Creature Properties block.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.SOURCE_AMBIGUOUS,
        pageId,
        reason:
          'multiple-properties-sources',
        details: {
          count:
            candidates.length
        }
      }
    );
  }

  const block =
    candidates[0];

  const cardType =
    String(
      block.dataset.cardType || ''
    );

  if (!SUPPORTED_CARD_TYPES.has(cardType)) {

    throw new CharacterHealthMutationError(
      'Character health Properties source has an unsupported card type.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.SOURCE_UNSUPPORTED,
        pageId,
        reason:
          'unsupported-card-type'
      }
    );
  }

  const controls =
    {};

  for (const field of HEALTH_FIELDS) {

    const matches =
      [
        ...block.querySelectorAll(
          `[data-property-name="${field}"]`
        )
      ];

    if (matches.length === 0) {

      throw new CharacterHealthMutationError(
        `Character health field ${field} is missing.`,
        {
          code:
            CHARACTER_HEALTH_MUTATION_ERROR_CODES.FIELD_MISSING,
          pageId,
          field,
          reason:
            'field-missing'
        }
      );
    }

    if (matches.length !== 1) {

      throw new CharacterHealthMutationError(
        `Character health field ${field} is duplicated.`,
        {
          code:
            CHARACTER_HEALTH_MUTATION_ERROR_CODES.FIELD_DUPLICATE,
          pageId,
          field,
          reason:
            'field-duplicate',
          details: {
            count:
              matches.length
          }
        }
      );
    }

    const control =
      matches[0];

    if (
      !control.matches('input') ||
      (
        control.type !== 'number' &&
        control.dataset.propertyType !== 'number'
      )
    ) {

      throw new CharacterHealthMutationError(
        `Character health field ${field} is not an explicit numeric Properties input.`,
        {
          code:
            CHARACTER_HEALTH_MUTATION_ERROR_CODES.FIELD_INVALID,
          pageId,
          field,
          reason:
            'field-not-numeric'
        }
      );
    }

    controls[field] =
      control;
  }

  const model =
    readPropertiesModelFromElement(
      block
    );

  if (!model) {

    throw new CharacterHealthMutationError(
      'Character health Properties source could not be read.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.SOURCE_UNSUPPORTED,
        pageId,
        reason:
          'properties-read-failed'
      }
    );
  }

  return {
    wrapper,
    block,
    cardType,
    controls,
    model,
    frontMatter:
      readFrontMatter(
        content
      )
  };
}


function readHealthTuple(
  inspection,
  pageId
) {

  const health =
    {};

  for (const field of HEALTH_FIELDS) {

    const raw =
      inspection.controls[field]
        .getAttribute('value');

    if (
      raw === null ||
      raw.trim() === ''
    ) {

      throw new CharacterHealthMutationError(
        `Character health field ${field} requires an explicit value.`,
        {
          code:
            CHARACTER_HEALTH_MUTATION_ERROR_CODES.FIELD_INVALID,
          pageId,
          field,
          reason:
            'value-missing'
        }
      );
    }

    const value =
      Number(
        raw
      );

    if (!Number.isSafeInteger(value)) {

      throw new CharacterHealthMutationError(
        `Character health field ${field} must contain a finite safe integer.`,
        {
          code:
            CHARACTER_HEALTH_MUTATION_ERROR_CODES.FIELD_INVALID,
          pageId,
          field,
          reason:
            'value-not-integer'
        }
      );
    }

    if (
      field === 'hpMax'
        ? value <= 0
        : value < 0
    ) {

      throw new CharacterHealthMutationError(
        `Character health field ${field} is outside its writable range.`,
        {
          code:
            CHARACTER_HEALTH_MUTATION_ERROR_CODES.FIELD_INVALID,
          pageId,
          field,
          reason:
            'value-out-of-range'
        }
      );
    }

    health[field] =
      value;
  }

  if (health.hpCurrent > health.hpMax) {

    throw new CharacterHealthMutationError(
      'Character current HP cannot exceed maximum HP.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.HEALTH_INVALID,
        pageId,
        field:
          'hpCurrent',
        reason:
          'current-exceeds-max'
      }
    );
  }

  return health;
}


function resolveAfterHealth({
  request,
  character,
  before,
  pageId
}) {

  if (request.type === CHARACTER_HEALTH_MUTATION_TYPES.DELTA) {

    const next =
      getCharacterHealth(
        applyCharacterHealthChange(
          character,
          {
            delta:
              request.delta
          }
        )
      );

    return {
      hpCurrent:
        next.current,
      hpMax:
        before.hpMax,
      hpTemp:
        next.temp
    };
  }

  const after = {
    hpCurrent:
      request.hpCurrent,
    hpMax:
      before.hpMax,
    hpTemp:
      request.hpTemp
  };

  if (after.hpCurrent > after.hpMax) {

    throw new CharacterHealthMutationError(
      'Exact Character current HP cannot exceed the existing maximum HP.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.HEALTH_INVALID,
        pageId,
        field:
          'hpCurrent',
        reason:
          'current-exceeds-max'
      }
    );
  }

  return after;
}


function createNextContent({
  content,
  inspection,
  after,
  pageId
}) {

  for (const field of MUTABLE_HEALTH_FIELDS) {

    if (
      !setPropertyFieldValue(
        inspection.block,
        field,
        after[field]
      )
    ) {

      throw new CharacterHealthMutationError(
        `Character health field ${field} could not be prepared.`,
        {
          code:
            CHARACTER_HEALTH_MUTATION_ERROR_CODES.READBACK_FAILED,
          pageId,
          field,
          reason:
            'field-write-failed'
        }
      );
    }
  }

  return replaceBodyPreservingFrontMatter(
    content,
    inspection.wrapper.innerHTML
  );
}


function assertReadback({
  pageId,
  beforeInspection,
  afterInspection,
  beforeCharacter,
  afterCharacter,
  before,
  after,
  originalContent,
  nextContent
}) {

  const readback =
    readHealthTuple(
      afterInspection,
      pageId
    );

  if (!sameHealth(readback, after)) {

    throw readbackError(
      pageId,
      'health-values-mismatch'
    );
  }

  assertCharacterMatchesSource(
    afterCharacter,
    afterInspection,
    pageId,
    'after'
  );

  const modelHealth =
    getCharacterHealth(
      afterCharacter
    );

  if (
    modelHealth.current !== after.hpCurrent ||
    modelHealth.max !== after.hpMax ||
    modelHealth.temp !== after.hpTemp
  ) {

    throw readbackError(
      pageId,
      'character-health-mismatch'
    );
  }

  if (
    beforeInspection.cardType !== afterInspection.cardType ||
    beforeCharacter.source !== afterCharacter.source ||
    before.hpMax !== after.hpMax ||
    beforeInspection.frontMatter !== afterInspection.frontMatter
  ) {

    throw readbackError(
      pageId,
      'source-or-guard-changed'
    );
  }

  if (
    createUnrelatedPropertiesSnapshot(
      beforeInspection.model
    ) !== createUnrelatedPropertiesSnapshot(
      afterInspection.model
    )
  ) {

    throw readbackError(
      pageId,
      'unrelated-properties-changed'
    );
  }

  if (
    createUnrelatedContentSnapshot(
      originalContent
    ) !== createUnrelatedContentSnapshot(
      nextContent
    )
  ) {

    throw readbackError(
      pageId,
      'unrelated-content-changed'
    );
  }
}


function assertCharacterMatchesSource(
  character,
  inspection,
  pageId,
  stage
) {

  if (
    character?.source !== 'properties' ||
    character?.cardType !== inspection.cardType
  ) {

    throw new CharacterHealthMutationError(
      'CharacterModel did not resolve the exact writable Properties health source.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.SOURCE_UNSUPPORTED,
        pageId,
        reason:
          `${stage}-character-source-mismatch`
      }
    );
  }
}


function normalizeRequest(
  request,
  pageId
) {

  assertPlainObject(
    request,
    pageId
  );

  const type =
    String(
      request.type || ''
    );

  if (type === CHARACTER_HEALTH_MUTATION_TYPES.DELTA) {

    assertAllowedKeys(
      request,
      [
        'type',
        'delta'
      ],
      pageId
    );

    const delta =
      readRequestInteger(
        request.delta,
        'delta',
        pageId,
        {
          min:
            -Number.MAX_SAFE_INTEGER
        }
      );

    return {
      type,
      delta
    };
  }

  if (type === CHARACTER_HEALTH_MUTATION_TYPES.EXACT) {

    assertAllowedKeys(
      request,
      [
        'type',
        'hpCurrent',
        'hpTemp'
      ],
      pageId
    );

    return {
      type,
      hpCurrent:
        readRequestInteger(
          request.hpCurrent,
          'hpCurrent',
          pageId,
          {
            min:
              0
          }
        ),
      hpTemp:
        readRequestInteger(
          request.hpTemp,
          'hpTemp',
          pageId,
          {
            min:
              0
          }
        )
    };
  }

  throw new CharacterHealthMutationError(
    'Character health mutation type must be delta or exact.',
    {
      code:
        CHARACTER_HEALTH_MUTATION_ERROR_CODES.INVALID_REQUEST,
      pageId,
      field:
        'type',
      reason:
        'unsupported-type'
    }
  );
}


function readRequestInteger(
  value,
  field,
  pageId,
  {
    min
  }
) {

  if (
    !Number.isSafeInteger(value) ||
    value < min
  ) {

    throw new CharacterHealthMutationError(
      `Character health request field ${field} must be a supported integer.`,
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.INVALID_REQUEST,
        pageId,
        field,
        reason:
          'request-value-invalid'
      }
    );
  }

  return value;
}


function createBodyWrapper(
  content
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    stripFrontMatter(
      content
    );

  return wrapper;
}


function createUnrelatedPropertiesSnapshot(
  model
) {

  const values =
    {
      ...model.values
    };

  for (const field of HEALTH_FIELDS) {

    delete values[field];
  }

  return JSON.stringify({
    cardType:
      model.cardType,
    source:
      model.source,
    values,
    layout:
      model.layout,
    customFields:
      model.customFields,
    manualOverrides:
      model.manualOverrides
  });
}


function createUnrelatedContentSnapshot(
  content
) {

  const wrapper =
    createBodyWrapper(
      content
    );

  for (const field of MUTABLE_HEALTH_FIELDS) {

    wrapper
      .querySelectorAll(
        `.card-properties-block[data-block-type="properties"][data-card-type="character"] [data-property-name="${field}"], .card-properties-block[data-block-type="properties"][data-card-type="creature"] [data-property-name="${field}"]`
      )
      .forEach(control => {

        control.value =
          '';

        control.removeAttribute(
          'value'
        );
      });
  }

  return wrapper.innerHTML;
}


function readFrontMatter(
  content
) {

  return String(content || '')
    .match(/^---[\s\S]*?---/)?.[0] || '';
}


function stripFrontMatter(
  content
) {

  return String(content || '')
    .replace(/^---[\s\S]*?---/, '')
    .trim();
}


function replaceBodyPreservingFrontMatter(
  content,
  body
) {

  const frontMatter =
    readFrontMatter(
      content
    );

  if (!frontMatter) return body;

  return `${frontMatter}\n\n${body}\n`;
}


function sameHealth(
  left,
  right
) {

  return HEALTH_FIELDS.every(field =>
    left[field] === right[field]
  );
}


function readbackError(
  pageId,
  reason
) {

  return new CharacterHealthMutationError(
    'Prepared Character health content failed exact readback validation.',
    {
      code:
        CHARACTER_HEALTH_MUTATION_ERROR_CODES.READBACK_FAILED,
      pageId,
      reason
    }
  );
}


function assertPage(
  page
) {

  if (
    !page ||
    typeof page !== 'object' ||
    typeof page.id !== 'string' ||
    !page.id.trim() ||
    typeof page.content !== 'string' ||
    !page.content
  ) {

    throw new CharacterHealthMutationError(
      'Character health preparation requires an existing page with id and content.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.INVALID_PAGE,
        pageId:
          typeof page?.id === 'string'
            ? page.id
            : '',
        reason:
          'invalid-page'
      }
    );
  }
}


function assertPlainObject(
  value,
  pageId
) {

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![
      Object.prototype,
      null
    ].includes(
      Object.getPrototypeOf(value)
    )
  ) {

    throw new CharacterHealthMutationError(
      'Character health mutation request must be a plain object.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.INVALID_REQUEST,
        pageId,
        reason:
          'request-not-plain-object'
      }
    );
  }
}


function assertAllowedKeys(
  value,
  allowedKeys,
  pageId
) {

  const allowed =
    new Set(
      allowedKeys
    );

  const keys =
    Reflect.ownKeys(
      Object.getOwnPropertyDescriptors(
        value
      )
    );

  const invalid =
    keys.find(key =>
      typeof key !== 'string' ||
      !allowed.has(key)
    );

  if (invalid !== undefined) {

    throw new CharacterHealthMutationError(
      'Character health mutation request contains an unsupported field.',
      {
        code:
          CHARACTER_HEALTH_MUTATION_ERROR_CODES.INVALID_REQUEST,
        pageId,
        field:
          typeof invalid === 'string'
            ? invalid
            : '',
        reason:
          'request-field-unsupported'
      }
    );
  }
}


function clonePage(
  page,
  content
) {

  return {
    ...page,
    content,
    tags:
      Array.isArray(page.tags)
        ? [
          ...page.tags
        ]
        : page.tags,
    aliases:
      Array.isArray(page.aliases)
        ? [
          ...page.aliases
        ]
        : page.aliases,
    relationships:
      Array.isArray(page.relationships)
        ? page.relationships.map(relationship => ({
          ...relationship
        }))
        : page.relationships
  };
}


function clonePlainData(
  value
) {

  return JSON.parse(
    JSON.stringify(value)
  );
}


function deepFreeze(
  value,
  seen =
    new WeakSet()
) {

  if (
    value === null ||
    typeof value !== 'object' ||
    seen.has(value)
  ) {

    return value;
  }

  seen.add(
    value
  );

  Object.freeze(
    value
  );

  for (const child of Object.values(value)) {

    deepFreeze(
      child,
      seen
    );
  }

  return value;
}
