import {
  getCurrentSchemaVersion
} from '../schema/schemaVersions.js';


const DEFAULT_PAGE_TITLE =
  '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f';

export const PAGE_CONTENT_HASH_ALGORITHM =
  'fnv1a32';

const FRONT_MATTER_FIELD_ORDER =
  Object.freeze([
    'id',
    'schemaVersion',
    'updatedAt',
    'contentHash',
    'parent',
    'order',
    'tags',
    'template',
    'type',
    'aliases',
    'relationshipsJson'
  ]);

const CANONICAL_FRONT_MATTER_KEYS =
  Object.freeze({
    id: 'id',
    schemaversion: 'schemaVersion',
    updatedat: 'updatedAt',
    contenthash: 'contentHash',
    parent: 'parent',
    order: 'order',
    tags: 'tags',
    template: 'template',
    type: 'type',
    aliases: 'aliases',
    relationshipsjson: 'relationshipsJson'
  });


export function parsePageRecordContent(
  content,
  options = {}
) {

  const source =
    String(content || '');

  const split =
    splitPageFrontMatter(
      source
    );

  const frontMatter =
    parseFrontMatter(
      split.frontMatter
    );

  const relationshipsResult =
    parseRelationshipsJson(
      frontMatter.values.relationshipsjson || ''
    );

  const rawBody =
    normalizeParsedBody(
      split.body
    );

  const bodyForHash =
    normalizeOutputBody(
      rawBody
    );

  const schemaVersionStatus =
    parsePageSchemaVersion(
      frontMatter.values.schemaversion
    );

  const updatedAtStatus =
    parseUpdatedAt(
      frontMatter.values.updatedat
    );

  const contentHashStatus =
    parseContentHash(
      frontMatter.values.contenthash,
      createPageContentHash(
        bodyForHash
      )
    );

  const metadata =
    normalizePageRecordMetadata(
      {
        id:
          frontMatter.values.id,
        schemaVersion:
          schemaVersionStatus.version,
        updatedAt:
          updatedAtStatus.value,
        contentHash:
          contentHashStatus.value,
        parent:
          frontMatter.values.parent,
        order:
          frontMatter.values.order,
        tags:
          parseListValue(
            frontMatter.values.tags
          ),
        template:
          frontMatter.values.template || null,
        type:
          frontMatter.values.type || null,
        aliases:
          parseListValue(
            frontMatter.values.aliases
          ),
        relationships:
          relationshipsResult.relationships
      },
      options
    );

  const body =
    rawBody.trim();

  const parseIssues =
    [];

  if (!relationshipsResult.valid) {

    parseIssues.push({
      code:
        'page.invalid_relationships_json',
      message:
        'Invalid relationshipsJson front matter skipped.'
    });
  }

  return {
    ...metadata,
    title:
      extractPageTitle(
        body
      ),
    body,
    rawBody,
    content:
      source,
    frontMatter:
      {
        raw:
          split.frontMatter,
        entries:
          frontMatter.entries,
        values:
          frontMatter.values
      },
    invalidFrontMatter:
      relationshipsResult.valid
        ? {}
        : {
          relationshipsJson:
            frontMatter.values.relationshipsjson || ''
        },
    pageRecordStatus:
      {
        schemaVersionMissing:
          schemaVersionStatus.missing,
        schemaVersionInvalid:
          schemaVersionStatus.invalid,
        schemaVersionState:
          schemaVersionStatus.state,
        updatedAtMissing:
          updatedAtStatus.missing,
        updatedAtInvalid:
          updatedAtStatus.invalid,
        contentHashMissing:
          contentHashStatus.missing,
        contentHashValid:
          contentHashStatus.valid,
        expectedContentHash:
          contentHashStatus.expected,
        parseIssues
      },
    parseIssues
  };
}


export function buildPageRecordContent({
  id,
  schemaVersion = getCurrentPageSchemaVersion(),
  updatedAt = null,
  parent = null,
  order = Date.now(),
  tags = [],
  template = 'card',
  type = 'note',
  aliases = [],
  relationships = [],
  body = '',
  frontMatter = null,
  invalidFrontMatter = {},
  sanitizeBody = null,
  now = null
} = {}) {

  const serializedBody =
    sanitizePageRecordBody(
      body,
      sanitizeBody
    );

  const outputBody =
    normalizeOutputBody(
      serializedBody
    );

  const record =
    normalizePageRecordMetadata(
      {
        id,
        schemaVersion,
        updatedAt:
          normalizeUpdatedAt(
            updatedAt
          ) ||
          createTimestamp(
            now
          ),
        contentHash:
          createPageContentHash(
            outputBody
          ),
        parent,
        order,
        tags,
        template,
        type,
        aliases,
        relationships
      },
      {
        generateId:
          false
      }
    );

  const frontMatterLines =
    buildFrontMatterLines({
      entries:
        frontMatter?.entries || [],
      record,
      invalidFrontMatter
    });

  return `---\n${frontMatterLines.join('\n')}\n---\n\n${outputBody}`;
}


export function serializePageRecord(
  record,
  options = {}
) {

  return buildPageRecordContent({
    ...record,
    frontMatter:
      record?.frontMatter || null,
    invalidFrontMatter:
      record?.invalidFrontMatter || {},
    sanitizeBody:
      options.sanitizeBody || null,
    now:
      options.now || null
  });
}


export function updatePageRecordContent(
  content,
  metadataPatch = {},
  options = {}
) {

  const parsed =
    parsePageRecordContent(
      content,
      {
        generateId:
          false
      }
    );

  return serializePageRecord(
    {
      ...parsed,
      ...metadataPatch,
      body:
        hasOwn(
          metadataPatch,
          'body'
        )
          ? metadataPatch.body
          : parsed.rawBody,
      updatedAt:
        hasOwn(
          metadataPatch,
          'updatedAt'
        )
          ? metadataPatch.updatedAt
          : (
            options.updateTimestamp === false
              ? parsed.updatedAt
              : createTimestamp(
                options.now || null
              )
          ),
      frontMatter:
        parsed.frontMatter,
      invalidFrontMatter:
        parsed.invalidFrontMatter
    },
    {
      ...options,
      now:
        options.now || null
    }
  );
}


export function createRuntimePageFromContent({
  content,
  name,
  path,
  handle = null,
  parentDirHandle = null
}) {

  const parsed =
    parsePageRecordContent(
      content
    );

  return {
    id:
      parsed.id,
    schemaVersion:
      parsed.schemaVersion,
    updatedAt:
      parsed.updatedAt,
    contentHash:
      parsed.contentHash,
    pageRecordStatus:
      parsed.pageRecordStatus,
    parent:
      parsed.parent,
    order:
      parsed.order,
    name,
    title:
      parsed.title,
    type:
      parsed.type,
    tags:
      parsed.tags,
    template:
      parsed.template,
    aliases:
      parsed.aliases,
    relationships:
      parsed.relationships,
    path,
    handle,
    parentDirHandle,
    content
  };
}


export function createPageContentHash(
  body
) {

  const text =
    String(body || '');

  let hash =
    0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {

    hash ^=
      text.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        0x01000193
      ) >>> 0;
  }

  return `${PAGE_CONTENT_HASH_ALGORITHM}:${hash.toString(16).padStart(8, '0')}`;
}


export function formatRelationshipsFrontMatter(
  relationships
) {

  const normalized =
    normalizeRelationships(
      relationships
    );

  if (normalized.length === 0) return '';

  return `relationshipsJson: ${JSON.stringify(normalized)}\n`;
}


export function normalizeRelationships(
  relationships
) {

  if (!Array.isArray(relationships)) return [];

  return relationships
    .map(relationship =>
      normalizeRelationship(
        relationship
      )
    )
    .filter(relationship =>
      relationship.targetId ||
      relationship.targetTitle
    );
}


function splitPageFrontMatter(
  content
) {

  const normalized =
    String(content || '').replace(
      /^\uFEFF/,
      ''
    );

  const match =
    normalized.match(
      /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
    );

  if (!match) {

    return {
      frontMatter:
        '',
      body:
        normalized
    };
  }

  return {
    frontMatter:
      match[1],
    body:
      normalized.slice(
        match[0].length
      )
  };
}


function parseFrontMatter(
  frontMatter
) {

  const entries =
    String(frontMatter || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line =>
        parseFrontMatterLine(
          line
        )
      );

  const values =
    {};

  entries.forEach(entry => {

    if (!entry.normalizedKey) return;

    if (values[entry.normalizedKey] !== undefined) return;

    values[entry.normalizedKey] =
      entry.value;
  });

  return {
    entries,
    values
  };
}


function parseFrontMatterLine(
  line
) {

  const match =
    String(line || '').match(
      /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/
    );

  if (!match) {

    return {
      raw:
        line,
      key:
        null,
      normalizedKey:
        null,
      value:
        null
    };
  }

  return {
    raw:
      line,
    key:
      match[1],
    normalizedKey:
      match[1].toLowerCase(),
    value:
      match[2]
  };
}


function normalizePageRecordMetadata(
  metadata,
  options = {}
) {

  return {
    id:
      normalizeString(
        metadata.id
      ) ||
      (
        options.generateId === false
          ? ''
          : crypto.randomUUID()
      ),
    schemaVersion:
      normalizeSchemaVersion(
        metadata.schemaVersion
      ),
    updatedAt:
      normalizeUpdatedAt(
        metadata.updatedAt
      ),
    contentHash:
      normalizeContentHash(
        metadata.contentHash
      ),
    parent:
      normalizeParent(
        metadata.parent
      ),
    order:
      normalizeOrder(
        metadata.order
      ),
    tags:
      normalizeStringList(
        metadata.tags,
        {
          lower:
            true
        }
      ),
    template:
      normalizeString(
        metadata.template
      ) || null,
    type:
      normalizeString(
        metadata.type
      ) || null,
    aliases:
      normalizeStringList(
        metadata.aliases
      ),
    relationships:
      normalizeRelationships(
        metadata.relationships
      )
  };
}


function normalizeSchemaVersion(
  value
) {

  const version =
    Number(value);

  if (
    Number.isFinite(version) &&
    version > 0
  ) {

    return version;
  }

  return getCurrentPageSchemaVersion();
}


function normalizeUpdatedAt(
  value
) {

  const normalized =
    normalizeString(
      value
    );

  if (!normalized) return null;

  return normalized;
}


function normalizeContentHash(
  value
) {

  const normalized =
    normalizeString(
      value
    );

  return normalized || null;
}


function normalizeParent(
  value
) {

  const normalized =
    normalizeString(
      value
    );

  if (!normalized || normalized === 'null') return null;

  return normalized;
}


function normalizeOrder(
  value
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


function normalizeString(
  value
) {

  return String(value ?? '')
    .trim();
}


function normalizeStringList(
  values,
  options = {}
) {

  if (!Array.isArray(values)) return [];

  return values
    .map(value =>
      normalizeString(
        value
      )
    )
    .filter(Boolean)
    .map(value =>
      options.lower
        ? value.toLowerCase()
        : value
    );
}


function parseListValue(
  value
) {

  const raw =
    normalizeString(
      value
    );

  if (!raw) return [];

  const bracketMatch =
    raw.match(
      /^\[(.*)\]$/
    );

  const listBody =
    bracketMatch
      ? bracketMatch[1]
      : raw;

  return listBody
    .split(',')
    .map(item =>
      item.trim()
    )
    .filter(Boolean);
}


function parsePageSchemaVersion(
  value
) {

  const raw =
    normalizeString(
      value
    );

  const currentVersion =
    getCurrentPageSchemaVersion();

  if (!raw) {

    const state =
      createPageSchemaVersionState(
        currentVersion
      );

    return {
      version:
        currentVersion,
      missing:
        true,
      invalid:
        false,
      state:
        {
          ...state,
          isMissing:
            true
        }
    };
  }

  const parsed =
    Number(raw);

  const invalid =
    !Number.isFinite(parsed) ||
    parsed <= 0;

  const version =
    invalid
      ? currentVersion
      : parsed;

  return {
    version,
    missing:
      false,
    invalid,
    state:
      createPageSchemaVersionState(
        version,
        {
          invalid
        }
      )
  };
}


function createPageSchemaVersionState(
  version,
  options = {}
) {

  const currentVersion =
    getCurrentPageSchemaVersion();

  return {
    area:
      'page',
    version,
    currentVersion,
    isMissing:
      false,
    isInvalid:
      Boolean(
        options.invalid
      ),
    isFuture:
      version > currentVersion,
    isLegacy:
      version < currentVersion,
    isCurrent:
      version === currentVersion
  };
}


function parseUpdatedAt(
  value
) {

  const normalized =
    normalizeString(
      value
    );

  if (!normalized) {

    return {
      value:
        null,
      missing:
        true,
      invalid:
        false
    };
  }

  const timestamp =
    Date.parse(
      normalized
    );

  return {
    value:
      normalized,
    missing:
      false,
    invalid:
      !Number.isFinite(
        timestamp
      )
  };
}


function parseContentHash(
  value,
  expected
) {

  const normalized =
    normalizeString(
      value
    );

  if (!normalized) {

    return {
      value:
        null,
      missing:
        true,
      valid:
        null,
      expected
    };
  }

  return {
    value:
      normalized,
    missing:
      false,
    valid:
      normalized === expected,
    expected
  };
}


function parseRelationshipsJson(
  value
) {

  const raw =
    normalizeString(
      value
    );

  if (!raw) {

    return {
      relationships:
        [],
      valid:
        true
    };
  }

  try {

    return {
      relationships:
        normalizeRelationships(
          JSON.parse(
            raw
          )
        ),
      valid:
        true
    };

  } catch (error) {

    console.warn(
      'Invalid relationshipsJson front matter skipped.',
      error
    );

    return {
      relationships:
        [],
      valid:
        false
    };
  }
}


function buildFrontMatterLines({
  entries,
  record,
  invalidFrontMatter = {}
}) {

  const fieldValues =
    createFrontMatterValueMap(
      record,
      invalidFrontMatter
    );

  const written =
    new Set();

  const lines =
    [];

  entries.forEach(entry => {

    const canonicalKey =
      CANONICAL_FRONT_MATTER_KEYS[entry.normalizedKey];

    if (!canonicalKey) {

      if (entry.raw !== '') {

        lines.push(
          entry.raw
        );
      }

      return;
    }

    if (written.has(canonicalKey)) return;

    const value =
      fieldValues[canonicalKey];

    if (value !== null) {

      lines.push(
        `${canonicalKey}: ${value}`
      );
    }

    written.add(
      canonicalKey
    );
  });

  FRONT_MATTER_FIELD_ORDER.forEach(key => {

    if (written.has(key)) return;

    const value =
      fieldValues[key];

    if (value === null) return;

    lines.push(
      `${key}: ${value}`
    );

    written.add(
      key
    );
  });

  return lines;
}


function createFrontMatterValueMap(
  record,
  invalidFrontMatter
) {

  const relationships =
    normalizeRelationships(
      record.relationships
    );

  return {
    id:
      record.id || '',
    schemaVersion:
      record.schemaVersion || getCurrentPageSchemaVersion(),
    updatedAt:
      record.updatedAt || createTimestamp(),
    contentHash:
      record.contentHash || null,
    parent:
      record.parent ?? 'null',
    order:
      record.order ?? Date.now(),
    tags:
      `[${normalizeStringList(
        record.tags,
        {
          lower:
            true
        }
      ).join(', ')}]`,
    template:
      record.template || 'card',
    type:
      record.type || 'note',
    aliases:
      `[${normalizeStringList(
        record.aliases
      ).join(', ')}]`,
    relationshipsJson:
      relationships.length > 0
        ? JSON.stringify(
          relationships
        )
        : (
          invalidFrontMatter.relationshipsJson
            ? invalidFrontMatter.relationshipsJson
            : null
        )
  };
}


function sanitizePageRecordBody(
  body,
  sanitizer
) {

  const text =
    String(body || '');

  return typeof sanitizer === 'function'
    ? String(
      sanitizer(
        text
      )
    )
    : text;
}


function normalizeParsedBody(
  body
) {

  const normalized =
    String(body || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

  return normalized.startsWith('\n')
    ? normalized.slice(1)
    : normalized;
}


function normalizeOutputBody(
  body
) {

  const normalized =
    String(body || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

  if (!normalized) return '';

  return normalized.endsWith('\n')
    ? normalized
    : `${normalized}\n`;
}


function createTimestamp(
  now = null
) {

  if (now instanceof Date) {

    return now.toISOString();
  }

  if (typeof now === 'function') {

    return createTimestamp(
      now()
    );
  }

  const normalized =
    normalizeUpdatedAt(
      now
    );

  if (normalized) return normalized;

  return new Date().toISOString();
}


function getCurrentPageSchemaVersion() {

  return getCurrentSchemaVersion(
    'page'
  );
}


function hasOwn(
  target,
  key
) {

  return Object.prototype.hasOwnProperty.call(
    target || {},
    key
  );
}


function extractPageTitle(
  body
) {

  const titleMatch =
    String(body || '').match(
      /<h1\b[^>]*>([\s\S]*?)<\/h1>/i
    );

  if (!titleMatch) return DEFAULT_PAGE_TITLE;

  const title =
    titleMatch[1]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  return title || DEFAULT_PAGE_TITLE;
}


function normalizeRelationship(
  relationship
) {

  const normalized = {
    type:
      normalizeString(
        relationship?.type || 'related'
      ) || 'related'
  };

  const targetId =
    normalizeString(
      relationship?.targetId || relationship?.pageId || ''
    );

  const targetTitle =
    normalizeString(
      relationship?.targetTitle || relationship?.target || ''
    );

  const label =
    normalizeString(
      relationship?.label || ''
    );

  if (targetId) {

    normalized.targetId =
      targetId;
  }

  if (targetTitle) {

    normalized.targetTitle =
      targetTitle;
  }

  if (label) {

    normalized.label =
      label;
  }

  return normalized;
}
