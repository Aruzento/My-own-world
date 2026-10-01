// Content owner shared by Entity/Inspector. The portrait slot, not the first
// arbitrary image in free text, is the canonical primary image presentation.
const selector = '.media-box.is-portrait';

function inspect(body) {
  if (!globalThis.DOMParser) throw new Error('Primary image requires inert HTML reader');
  const template = new DOMParser().parseFromString('', 'text/html').createElement('template');
  template.innerHTML = body;
  const slots = [...template.content.querySelectorAll(selector)];
  if (slots.length > 1) throw new Error('Ambiguous primary image slots');
  if (slots[0] && [...slots[0].childNodes].some(node => node.nodeType === 3 ? node.textContent.trim() :
    node.nodeType === 1 && !node.matches('img[data-asset], [data-runtime="true"], [data-runtime-only="true"]'))) throw new Error('Primary image contains unsupported user content; review required');
  const images = slots[0] ? [...slots[0].querySelectorAll('img[data-asset]')] : [];
  if (images.length > 1) throw new Error('Ambiguous primary image assets');
  return { slot: slots[0], image: images[0] };
}

export function readPrimaryImage(body) {
  const { image } = inspect(body);
  if (!image) return undefined;
  const path = image.getAttribute('data-asset');
  // Existing image imports store asset-relative names; typed assets are workspace-relative.
  return { kind: 'asset', path: path.startsWith('assets/') ? path : `assets/${path}` };
}

export function writePrimaryImage(body, value) {
  const { slot } = inspect(body);
  const replacement = value === undefined ? '' : `<img data-asset="${escapeAttribute(value.path)}" data-crop-x="50" data-crop-y="50" data-crop-zoom="1" alt="">`;
  if (!slot) return value === undefined ? body : `${body}<div class="media-box is-portrait" contenteditable="false">${replacement}</div>`;
  // Preserve the exact surrounding raw body, including recovery payloads. Only
  // this approved slot's children change; no document-wide HTML normalization.
  const range = portraitContentRange(body);
  if (!range) throw new Error('Primary image source boundary requires review');
  return body.slice(0, range.start) + replacement + body.slice(range.end);
}

function portraitContentRange(body) {
  const tags = /<!--[\s\S]*?-->|<\/?([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*?>/gi;
  let start = null, depth = 0, raw = null;
  for (const match of body.matchAll(tags)) {
    if (!match[1]) continue;
    const name = match[1].toLowerCase(), closing = match[0].startsWith('</');
    if (raw) { if (closing && name === raw) raw = null; continue; }
    if (['script', 'style', 'textarea', 'title'].includes(name) && !closing) { raw = name; continue; }
    if (name !== 'div') continue;
    if (start === null && !closing) {
      const inert = new DOMParser().parseFromString(match[0] + '</div>', 'text/html');
      if (inert.body.firstElementChild?.matches(selector)) { start = match.index + match[0].length; depth = 1; }
    } else if (start !== null) {
      depth += closing ? -1 : 1;
      if (depth === 0) return { start, end: match.index };
    }
  }
  return null;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
