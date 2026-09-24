// Внутренняя часть PageRecord codec; это не самостоятельный storage owner.
export const VARIABLES_LIMITS = Object.freeze({ bytes: 1048576, depth: 32, collection: 10000 });
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export const isDataObject = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

export function readPageVariables(entries) {
  const lines = entries.filter(entry => entry.normalizedKey === 'variablesjson');
  if (!lines.length) return { mode: 'legacy', envelope: null, raw: [], issues: [] };
  const raw = lines.map(entry => entry.raw);
  try {
    if (lines.length !== 1) fail('duplicate_envelope');
    const text = lines[0].raw.slice(lines[0].raw.indexOf(':') + 1).trim();
    const envelope = parseStrictVariablesJSON(text);
    if (!isDataObject(envelope)) fail('invalid_envelope');
    if (!Number.isSafeInteger(envelope.formatVersion) || envelope.formatVersion < 1) fail('invalid_format_version');
    if (envelope.formatVersion !== 1) return {
      mode: 'unsupported', envelope, raw,
      issues: [diagnostic('unsupported_format_version')]
    };
    assertVariablesEnvelope(envelope);
    return { mode: 'structured', envelope, raw, issues: [] };
  } catch (error) {
    return { mode: 'invalid', envelope: null, raw,
      issues: [diagnostic(error.code || 'invalid_json')] };
  }
}

export function serializePageVariables(envelope) {
  assertJSONData(envelope);
  assertVariablesEnvelope(envelope);
  const text = canonicalJSON(envelope);
  if (new TextEncoder().encode(text).length > VARIABLES_LIMITS.bytes) fail('size_limit');
  return text;
}

export function assertVariablesEnvelope(value) {
  if (!isDataObject(value) || value.formatVersion !== 1) fail('unsupported_format_version');
  if (!Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1) fail('invalid_schema_version');
  if (typeof value.schemaDigest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value.schemaDigest)) fail('invalid_schema_digest');
  if (!isDataObject(value.values)) fail('invalid_values');
  if (own(value, 'overrides') && !isDataObject(value.overrides)) fail('invalid_overrides');
  if (own(value, 'extensions') && (!isDataObject(value.extensions) ||
      !Number.isSafeInteger(value.extensions.revision) || value.extensions.revision < 1 ||
      !Array.isArray(value.extensions.fields))) fail('invalid_extensions');
  if (own(value, 'inactive') && !Array.isArray(value.inactive)) fail('invalid_inactive');
  if (own(value, 'migration') && !isDataObject(value.migration)) fail('invalid_migration');
  for (const key of ['id', 'pageId', 'type', 'title', 'tags', 'computed', 'computedResults']) {
    if (own(value, key)) fail('duplicate_metadata_owner');
  }
}

export function assertJSONData(value, depth = 0, ancestors = new Set()) {
  if (depth > VARIABLES_LIMITS.depth) fail('depth_limit');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!Array.isArray(value) && !isDataObject(value)) fail('non_json_data');
  if (ancestors.has(value)) fail('circular_data');
  ancestors.add(value);
  const keys = Reflect.ownKeys(value).filter(key => !(Array.isArray(value) && key === 'length'));
  if (keys.length > VARIABLES_LIMITS.collection || (Array.isArray(value) && value.length > VARIABLES_LIMITS.collection)) fail('collection_limit');
  for (const key of keys) {
    if (typeof key !== 'string' || unsafeKeys.has(key)) fail('unsafe_key');
    if (Array.isArray(value) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) fail('non_json_data');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!own(descriptor, 'value') || !descriptor.enumerable) fail('non_json_data');
    assertJSONData(descriptor.value, depth + 1, ancestors);
  }
  if (Array.isArray(value) && keys.length !== value.length) fail('sparse_array');
  ancestors.delete(value);
}

export function canonicalJSON(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  if (isDataObject(value)) return `{${Object.keys(value).sort().map(key =>
    `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

// JSON.parse не сообщает duplicate keys: проверяем токены до нормализации.
export function parseStrictVariablesJSON(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > VARIABLES_LIMITS.bytes) fail('size_limit');
  let offset = 0;
  const whitespace = () => { while (/[\t\n\r ]/.test(text[offset] || 'x')) offset++; };
  function string() {
    const start = offset++;
    while (offset < text.length) {
      const char = text[offset++];
      if (char === '\\') offset++;
      else if (char === '"') return JSON.parse(text.slice(start, offset));
    }
    fail('invalid_json');
  }
  function value(depth) {
    if (depth > VARIABLES_LIMITS.depth) fail('depth_limit');
    whitespace();
    const char = text[offset];
    if (char === '"') return string();
    if (char === '{' || char === '[') {
      offset++;
      const object = char === '{';
      const result = object ? {} : [];
      const end = object ? '}' : ']';
      const keys = new Set();
      let count = 0;
      whitespace();
      if (text[offset] === end) { offset++; return result; }
      while (offset < text.length) {
        if (++count > VARIABLES_LIMITS.collection) fail('collection_limit');
        whitespace();
        let key;
        if (object) {
          if (text[offset] !== '"') fail('invalid_json');
          key = string();
          if (unsafeKeys.has(key)) fail('unsafe_key');
          if (keys.has(key)) fail('duplicate_key');
          keys.add(key);
          whitespace();
          if (text[offset++] !== ':') fail('invalid_json');
        }
        const child = value(depth + 1);
        if (object) result[key] = child; else result.push(child);
        whitespace();
        if (text[offset] === end) { offset++; return result; }
        if (text[offset++] !== ',') fail('invalid_json');
      }
      fail('invalid_json');
    }
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(offset));
    if (!match) fail('invalid_json');
    offset += match[0].length;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed === 'number' && !Number.isFinite(parsed)) fail('invalid_number');
    return parsed;
  }
  const parsed = value(0);
  whitespace();
  if (offset !== text.length) fail('invalid_json');
  return parsed;
}

function diagnostic(code) {
  return { severity: 'error', code: `variables.${code}`, message: `variablesJson: ${code}; raw data retained.` };
}
function fail(code) {
  const error = new Error(`variablesJson: ${code}`);
  error.code = code;
  throw error;
}
