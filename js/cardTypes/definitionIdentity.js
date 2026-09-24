const PRESENTATION_KEYS = new Set([
  'label',
  'help',
  'section',
  'group',
  'order',
  'visibility',
  'sections',
  'fieldOverrides'
]);


export function createDefinitionIdentity(
  kind,
  definition
) {
  return Object.freeze({
    kind,
    id: definition.id,
    version: definition.version,
    digest: digestDefinition(kind, definition)
  });
}


export function digestDefinition(
  kind,
  definition
) {
  return sha256Digest(
    stableStringify({
      kind,
      definition:
        createSemanticDefinitionSnapshot(definition)
    })
  );
}


export function digestDefinitionClosure(
  entries
) {
  const closure =
    entries
      .map(entry => ({
        kind: entry.kind,
        id: entry.definition.id,
        version: entry.definition.version,
        definition:
          createSemanticDefinitionSnapshot(entry.definition)
      }))
      .sort(compareDefinitionEntries);

  return sha256Digest(
    stableStringify({
      format: 'card-type-definition-closure-v1',
      definitions: closure
    })
  );
}


export function digestCanonicalData(value) {
  return sha256Digest(
    stableStringify(value)
  );
}


export function stableStringify(value) {
  if (value === null) return 'null';

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}


export function deepCloneData(value) {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(deepCloneData);
  }

  const clone = {};
  Object.keys(value).forEach(key => {
    clone[key] = deepCloneData(value[key]);
  });
  return clone;
}


export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}


function createSemanticDefinitionSnapshot(value) {
  // Исключаем presentation только в schema nodes, никогда внутри default/options data.
  const projected = {};
  for (const key of Object.keys(value).sort()) {
    if (PRESENTATION_KEYS.has(key)) continue;
    if (key === 'fields' || key === 'properties') {
      projected[key] = value[key].map(createSemanticDefinitionSnapshot)
        .sort((left, right) => left.key.localeCompare(right.key));
    } else if (key === 'items') {
      projected[key] = createSemanticDefinitionSnapshot(value[key]);
    } else if (key === 'includes') {
      projected[key] = deepCloneData(value[key]).sort((left, right) =>
        `${left.id}@${left.version}`.localeCompare(`${right.id}@${right.version}`));
    } else if (key === 'targetTypes') {
      projected[key] = [...value[key]].sort();
    } else if (key === 'options' && Array.isArray(value[key])) {
      projected[key] = value[key].map(option => ({ value: deepCloneData(option.value) }))
        .sort((left, right) => stableStringify(left.value).localeCompare(stableStringify(right.value)));
    } else {
      projected[key] = deepCloneData(value[key]);
    }
  }
  return projected;
}


function compareDefinitionEntries(left, right) {
  return `${left.kind}:${left.id}@${left.version}`
    .localeCompare(`${right.kind}:${right.id}@${right.version}`);
}


// Browser-safe SHA-256 avoids a Node-only dependency in the shared runtime.
function sha256Digest(text) {
  const bytes = new TextEncoder().encode(String(text));
  const words = [];
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;

  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const constants = SHA256_CONSTANTS;
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }

    for (let index = 16; index < 64; index += 1) {
      const a = words[index - 15];
      const b = words[index - 2];
      const s0 = rotateRight(a, 7) ^ rotateRight(a, 18) ^ (a >>> 3);
      const s1 = rotateRight(b, 17) ^ rotateRight(b, 19) ^ (b >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + s1 + choice + constants[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (s0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return `sha256:${[h0, h1, h2, h3, h4, h5, h6, h7]
    .map(value => value.toString(16).padStart(8, '0'))
    .join('')}`;
}


function rotateRight(value, count) {
  return (value >>> count) | (value << (32 - count));
}


const SHA256_CONSTANTS = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
