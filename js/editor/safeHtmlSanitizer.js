// Safe HTML boundary: первый исполняемый слой защиты persistent HTML.
// Он удаляет опасные конструкции, но не переписывает пользовательский текст.

const RUNTIME_SELECTOR = [
  '[data-runtime="true"]',
  '.block-actions',
  '.blocks-toolbar',
  '.block-drop-placeholder',
  '.add-block-row',
  '.backlinks-list',
  '.image-runtime-actions',
  '.table-row-controls',
  '.floating-toolbar',
  '.wiki-preview-popup',
  '.wiki-create-menu',
  '.toolbar-color-popup',
  '.campaign-map-toolbar',
  '.campaign-map-popup',
  '.campaign-map-drag-measure',
  '.campaign-map-selection',
  '.campaign-fog-locked-zone',
  '.task-tracker-board',
  '.task-add-btn',
  '.task-column-delete',
  '.task-check-delete',
  '.rule-tree-board'
].join(',');

const FORBIDDEN_TAGS = new Set([
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'style',
  'form'
]);

const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'xlink:href'
]);

const ALLOWED_TAGS = new Set([
  'a',
  'article',
  'b',
  'blockquote',
  'br',
  'button',
  'canvas',
  'circle',
  'code',
  'col',
  'colgroup',
  'div',
  'em',
  'figcaption',
  'figure',
  'g',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'i',
  'img',
  'input',
  'label',
  'li',
  'line',
  'main',
  'ol',
  'option',
  'p',
  'path',
  'picture',
  'polygon',
  'polyline',
  'pre',
  'rect',
  'script',
  'section',
  'select',
  'span',
  'strong',
  'svg',
  'table',
  'tbody',
  'td',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul'
]);

const GLOBAL_ATTRIBUTES = new Set([
  'aria-atomic',
  'aria-controls',
  'aria-describedby',
  'aria-expanded',
  'aria-hidden',
  'aria-label',
  'aria-live',
  'class',
  'contenteditable',
  'draggable',
  'role',
  'spellcheck',
  'tabindex',
  'title'
]);

const TAG_ATTRIBUTES = {
  a: [
    'href',
    'rel',
    'target'
  ],
  button: [
    'disabled',
    'type',
    'value'
  ],
  canvas: [
    'height',
    'width'
  ],
  col: [
    'span',
    'style',
    'width'
  ],
  img: [
    'alt',
    'height',
    'loading',
    'src',
    'width'
  ],
  input: [
    'checked',
    'disabled',
    'max',
    'min',
    'name',
    'placeholder',
    'readonly',
    'required',
    'step',
    'type',
    'value'
  ],
  label: [
    'for'
  ],
  option: [
    'disabled',
    'selected',
    'value'
  ],
  script: [
    'type'
  ],
  select: [
    'disabled',
    'multiple',
    'name',
    'required',
    'value'
  ],
  table: [
    'border'
  ],
  td: [
    'colspan',
    'rowspan'
  ],
  textarea: [
    'cols',
    'disabled',
    'name',
    'placeholder',
    'readonly',
    'required',
    'rows',
    'value'
  ],
  th: [
    'colspan',
    'rowspan',
    'scope'
  ]
};

const SVG_ATTRIBUTES = new Set([
  'aria-hidden',
  'cx',
  'cy',
  'd',
  'fill',
  'height',
  'points',
  'preserveaspectratio',
  'r',
  'rx',
  'ry',
  'stroke',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-width',
  'viewbox',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2'
]);

const ALLOWED_DATA_ATTRIBUTES = new Set([
  'data-ability',
  'data-asset',
  'data-asset-path',
  'data-asset-type',
  'data-block-type',
  'data-block-version',
  'data-brush-shape',
  'data-brush-size',
  'data-campaign-map',
  'data-card-shell',
  'data-card-tag',
  'data-card-type',
  'data-character-effects',
  'data-character-sheet-clear-override',
  'data-character-sheet-field',
  'data-character-sheet-override',
  'data-character-sheet-death-field',
  'data-character-sheet-death-index',
  'data-character-sheet-death-track',
  'data-check-id',
  'data-column-id',
  'data-condition-count',
  'data-effect-count',
  'data-effects-summary',
  'data-fill-color',
  'data-fog-image',
  'data-fog-locked-zones',
  'data-fog-mode',
  'data-grid',
  'data-grid-color',
  'data-grid-size',
  'data-h',
  'data-hp',
  'data-hp-max',
  'data-hp-percent',
  'data-hp-state',
  'data-hp-temp',
  'data-image-asset',
  'data-incapacitated',
  'data-internal-rule-id',
  'data-initiative-modifier',
  'data-initiative-state',
  'data-knowledge-graph',
  'data-knowledge-graph-view-state',
  'data-layer-id',
  'data-layer-state',
  'data-list-kind',
  'data-list-kind-control',
  'data-manual-value',
  'data-map-asset',
  'data-map-image',
  'data-map-image-key',
  'data-map-model-version',
  'data-map-music-state',
  'data-name',
  'data-page-id',
  'data-page-title',
  'data-persistent-editable',
  'data-placeholder',
  'data-player-token',
  'data-points',
  'data-presentation-hidden',
  'data-property-asset-type',
  'data-property-collapsed',
  'data-property-compound-name',
  'data-property-custom',
  'data-property-custom-value',
  'data-property-filter-type',
  'data-property-group-name',
  'data-property-id',
  'data-property-label',
  'data-property-layout',
  'data-property-name',
  'data-property-order',
  'data-property-placeholder',
  'data-property-rows',
  'data-property-span',
  'data-property-type',
  'data-property-x',
  'data-property-y',
  'data-rule-tree',
  'data-rule-tree-data',
  'data-rule-id',
  'data-rule-search',
  'data-shape-id',
  'data-shape-type',
  'data-size',
  'data-skill-proficiency-level',
  'data-source-mode',
  'data-source-type',
  'data-speed',
  'data-speed-zero',
  'data-stat',
  'data-stroke-color',
  'data-stroke-width',
  'data-task-id',
  'data-task-tracker',
  'data-task-tracker-data',
  'data-token-id',
  'data-token-type',
  'data-view-scale',
  'data-view-x',
  'data-view-y',
  'data-view-zoom',
  'data-w',
  'data-x',
  'data-y',
  'data-z-index'
]);

const ALLOWED_DATA_PREFIXES = [
  'data-crop-',
  'data-fog',
  'data-map-',
  'data-property-'
];

const ALLOWED_CLASS_PREFIXES = [
  'aliases-',
  'block-',
  'campaign-',
  'card-',
  'character-',
  'custom-',
  'dnd-',
  'dnd2-',
  'dynamic-',
  'editor-',
  'entity-',
  'hero-',
  'image-',
  'internal-',
  'knowledge-',
  'list-',
  'media-',
  'property-',
  'rule-',
  'singleline-',
  'table-',
  'task-',
  'template-',
  'text-',
  'ui-',
  'universal-',
  'wiki-'
];

const ALLOWED_CLASS_NAMES = new Set([
  'ProseMirror',
  'card-shell',
  'hero-block',
  'is-creature',
  'is-filled',
  'is-missing',
  'is-object',
  'is-player',
  'is-portrait',
  'rich-text-field',
  'tiptap'
]);

const RUNTIME_CLASS_NAMES = new Set([
  'is-active',
  'is-dragging',
  'is-resizing',
  'is-selected'
]);

const SAFE_INPUT_TYPES = new Set([
  'checkbox',
  'hidden',
  'number',
  'search',
  'text'
]);

const CONTROL_CHARS_EXCEPT_TEXT_FLOW =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const PASTE_EXECUTABLE_SELECTOR = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'form'
].join(',');

const PASTE_LINE_BREAK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tr',
  'ul'
]);

const PASTE_TAB_AFTER_TAGS = new Set([
  'td',
  'th'
]);


export function sanitizePersistentHTMLOnSave(
  html
) {

  return sanitizePersistentHTML(
    html,
    {
      boundary: 'save'
    }
  );
}


export function sanitizePersistentHTMLOnLoad(
  html
) {

  return sanitizePersistentHTML(
    html,
    {
      boundary: 'load'
    }
  );
}


export function sanitizePlainTextPaste(
  text
) {

  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(
      CONTROL_CHARS_EXCEPT_TEXT_FLOW,
      ''
    );
}


export function sanitizeClipboardPaste(
  clipboardData
) {

  const plainText =
    sanitizePlainTextPaste(
      getClipboardData(
        clipboardData,
        'text/plain'
      )
    );

  if (
    plainText
  ) {

    return {
      shouldHandle: true,
      source: 'text',
      text: plainText
    };
  }

  const htmlText =
    getClipboardData(
      clipboardData,
      'text/html'
    );

  if (
    htmlText
  ) {

    return {
      shouldHandle: true,
      source: 'html',
      text: sanitizeHTMLPasteToPlainText(
        htmlText
      )
    };
  }

  if (
    hasRichClipboardData(
      clipboardData
    )
  ) {

    return {
      shouldHandle: true,
      source: 'blocked-rich-data',
      text: ''
    };
  }

  return {
    shouldHandle: false,
    source: 'empty',
    text: ''
  };
}


function sanitizePersistentHTML(
  html,
  options = {}
) {

  const template =
    document.createElement('template');

  template.innerHTML =
    String(html || '');

  const wrapper =
    template.content;

  removeRuntimeElements(
    wrapper
  );

  sanitizeElementTree(
    wrapper,
    options
  );

  return serializeHTMLFragment(
    wrapper
  );
}


function sanitizeHTMLPasteToPlainText(
  html
) {

  const template =
    document.createElement('template');

  template.innerHTML =
    String(html || '');

  const wrapper =
    template.content;

  removeRuntimeElements(
    wrapper
  );

  wrapper
    .querySelectorAll(
      PASTE_EXECUTABLE_SELECTOR
    )
    .forEach(element => {

      element.remove();
    });

  return sanitizePlainTextPaste(
    normalizeExtractedPasteText(
      extractPasteText(
        wrapper
      )
    )
  );
}


function serializeHTMLFragment(
  fragment
) {

  const wrapper =
    document.createElement('div');

  wrapper.append(
    ...[
      ...fragment.childNodes
    ].map(child =>
      child.cloneNode(
        true
      )
    )
  );

  return wrapper.innerHTML;
}


function extractPasteText(
  node
) {

  if (!node) return '';

  if (
    node.nodeType === Node.TEXT_NODE
  ) {

    return node.nodeValue || '';
  }

  if (
    node.nodeType !== Node.ELEMENT_NODE &&
    node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
  ) {

    return '';
  }

  const tagName =
    node.nodeType === Node.ELEMENT_NODE
      ? node.tagName.toLowerCase()
      : '';

  if (
    tagName === 'br'
  ) {

    return '\n';
  }

  const text =
    [
      ...node.childNodes
    ]
      .map(child =>
        extractPasteText(
          child
        )
      )
      .join('');

  if (
    PASTE_TAB_AFTER_TAGS.has(
      tagName
    )
  ) {

    return `${text}\t`;
  }

  if (
    PASTE_LINE_BREAK_TAGS.has(
      tagName
    )
  ) {

    return `${text}\n`;
  }

  return text;
}


function normalizeExtractedPasteText(
  text
) {

  return String(text || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\t+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


function getClipboardData(
  clipboardData,
  type
) {

  try {

    return clipboardData?.getData?.(type) || '';

  } catch {

    return '';
  }
}


function hasRichClipboardData(
  clipboardData
) {

  const types =
    [
      ...(clipboardData?.types || [])
    ]
      .map(type =>
        String(type || '')
          .toLowerCase()
      );

  if (
    types.some(type =>
      type === 'text/html' ||
      type === 'files' ||
      type.startsWith('image/')
    )
  ) return true;

  if (
    clipboardData?.files?.length
  ) return true;

  return false;
}


function removeRuntimeElements(
  root
) {

  root
    .querySelectorAll(
      RUNTIME_SELECTOR
    )
    .forEach(element => {

      element.remove();
    });
}


function sanitizeElementTree(
  root,
  options
) {

  [...root.querySelectorAll('*')]
    .forEach(element => {

      const tagName =
        element.tagName.toLowerCase();

      if (
        shouldRemoveElement(
          element,
          tagName
        )
      ) {

        element.remove();
        return;
      }

      if (
        !ALLOWED_TAGS.has(
          tagName
        )
      ) {

        unwrapElement(
          element
        );

        return;
      }

      sanitizeAttributes(
        element,
        tagName,
        options
      );
    });
}


function shouldRemoveElement(
  element,
  tagName
) {

  if (
    tagName === 'script'
  ) {

    return !isSafeJsonScript(
      element
    );
  }

  return FORBIDDEN_TAGS.has(
    tagName
  );
}


function isSafeJsonScript(
  element
) {

  return (
    element.getAttribute('type') === 'application/json' &&
    (
      isTaskTrackerJsonScript(
        element
      ) ||
      isCharacterEffectsJsonScript(
        element
      ) ||
      isRuleTreeJsonScript(
        element
      ) ||
      isKnowledgeGraphJsonScript(
        element
      )
    )
  );
}


function sanitizeAttributes(
  element,
  tagName,
  options
) {

  [...element.attributes]
    .forEach(attribute => {

      const name =
        attribute.name.toLowerCase();

      const value =
        attribute.value || '';

      if (
        !isAllowedAttribute(
          name,
          tagName
        )
      ) {

        element.removeAttribute(
          attribute.name
        );

        return;
      }

      if (
        name.startsWith('on')
      ) {

        element.removeAttribute(
          attribute.name
        );

        return;
      }

      if (
        name === 'class'
      ) {

        sanitizeClassAttribute(
          element
        );

        return;
      }

      if (
        name === 'contenteditable'
      ) {

        sanitizeTokenAttribute(
          element,
          attribute.name,
          [
            'false',
            'plaintext-only',
            'true'
          ]
        );

        return;
      }

      if (
        tagName === 'input' &&
        name === 'type'
      ) {

        sanitizeInputType(
          element
        );

        return;
      }

      if (
        tagName === 'button' &&
        name === 'type' &&
        value !== 'button'
      ) {

        element.setAttribute(
          attribute.name,
          'button'
        );

        return;
      }

      if (
        name === 'style'
      ) {

        sanitizeStyleAttribute(
          element,
          tagName
        );

        return;
      }

      if (
        URL_ATTRIBUTES.has(name) &&
        isUnsafeUrl(
          value,
          {
            tagName,
            boundary: options.boundary
          }
        )
      ) {

        element.removeAttribute(
          attribute.name
        );

        return;
      }

      if (
        tagName === 'script' &&
        !isAllowedJsonScriptAttribute(
          name
        )
      ) {

        element.removeAttribute(
          attribute.name
        );
      }
    });

  if (
    tagName === 'script' &&
    isTaskTrackerJsonScript(
      element
    )
  ) {

    element.className =
      'task-tracker-data';

    element.setAttribute(
      'data-task-tracker-data',
      ''
    );
  }

  if (
    tagName === 'script' &&
    isCharacterEffectsJsonScript(
      element
    )
  ) {

    element.className =
      'character-effects-data';

    element.setAttribute(
      'data-character-effects',
      ''
    );
  }

  if (
    tagName === 'script' &&
    isRuleTreeJsonScript(
      element
    )
  ) {

    element.className =
      'rule-tree-data';

    element.setAttribute(
      'data-rule-tree-data',
      ''
    );
  }

  if (
    tagName === 'script' &&
    isKnowledgeGraphJsonScript(
      element
    )
  ) {

    element.className =
      'knowledge-graph-view-state';

    element.setAttribute(
      'data-knowledge-graph-view-state',
      ''
    );
  }

  hardenExternalLink(
    element,
    tagName
  );
}


function isAllowedAttribute(
  name,
  tagName
) {

  if (
    tagName === 'script'
  ) {

    return isAllowedJsonScriptAttribute(
      name
    );
  }

  if (
    name.startsWith('on')
  ) return false;

  if (
    name.startsWith('data-')
  ) {

    return isAllowedDataAttribute(
      name
    );
  }

  if (
    GLOBAL_ATTRIBUTES.has(name)
  ) return true;

  if (
    SVG_ATTRIBUTES.has(name) &&
    isSvgTag(
      tagName
    )
  ) return true;

  return (
    TAG_ATTRIBUTES[tagName] || []
  ).includes(
    name
  );
}


function isAllowedDataAttribute(
  name
) {

  return (
    ALLOWED_DATA_ATTRIBUTES.has(name) ||
    ALLOWED_DATA_PREFIXES.some(prefix =>
      name.startsWith(prefix)
    )
  );
}


function isSvgTag(
  tagName
) {

  return [
    'circle',
    'g',
    'line',
    'path',
    'polygon',
    'polyline',
    'rect',
    'svg'
  ].includes(
    tagName
  );
}


function unwrapElement(
  element
) {

  const parent =
    element.parentNode;

  if (!parent) return;

  while (
    element.firstChild
  ) {

    parent.insertBefore(
      element.firstChild,
      element
    );
  }

  element.remove();
}


function sanitizeClassAttribute(
  element
) {

  const classes =
    [
      ...element.classList
    ]
      .filter(className =>
        isAllowedClassName(
          className
        )
      );

  if (
    classes.length === 0
  ) {

    element.removeAttribute(
      'class'
    );

    return;
  }

  element.setAttribute(
    'class',
    classes.join(' ')
  );
}


function isAllowedClassName(
  className
) {

  if (
    RUNTIME_CLASS_NAMES.has(className)
  ) return false;

  return (
    ALLOWED_CLASS_NAMES.has(className) ||
    ALLOWED_CLASS_PREFIXES.some(prefix =>
      className.startsWith(prefix)
    )
  );
}


function sanitizeTokenAttribute(
  element,
  name,
  allowedValues
) {

  const value =
    String(
      element.getAttribute(name) || ''
    )
      .toLowerCase();

  if (
    allowedValues.includes(value)
  ) return;

  element.removeAttribute(
    name
  );
}


function sanitizeInputType(
  element
) {

  const type =
    String(
      element.getAttribute('type') || ''
    )
      .toLowerCase();

  if (
    SAFE_INPUT_TYPES.has(type)
  ) {

    element.setAttribute(
      'type',
      type
    );

    return;
  }

  element.setAttribute(
    'type',
    'text'
  );
}


function sanitizeStyleAttribute(
  element,
  tagName
) {

  if (
    tagName !== 'col'
  ) {

    element.removeAttribute(
      'style'
    );

    return;
  }

  const width =
    extractSafeWidth(
      element.getAttribute('style') || ''
    );

  if (!width) {

    element.removeAttribute(
      'style'
    );

    return;
  }

  element.setAttribute(
    'style',
    `width: ${width};`
  );
}


function extractSafeWidth(
  style
) {

  const match =
    String(style)
      .match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?px)\s*(?:;|$)/i);

  return match?.[1] || '';
}


function isUnsafeUrl(
  value,
  options
) {

  const normalized =
    String(value || '')
      .trim()
      .replace(/[\u0000-\u001F\u007F\s]+/g, '')
      .toLowerCase();

  if (!normalized) return false;

  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:')
  ) return true;

  if (
    normalized.startsWith('data:text/html')
  ) return true;

  if (
    normalized.startsWith('data:image/svg+xml')
  ) return true;

  if (
    normalized.startsWith('data:') &&
    !isSafeImageDataUrl(
      normalized,
      options
    )
  ) return true;

  if (
    normalized.startsWith('blob:') &&
    (
      options.boundary === 'save' ||
      options.tagName === 'img'
    )
  ) return true;

  return false;
}


function isSafeImageDataUrl(
  normalized,
  options
) {

  return (
    options.tagName === 'img' &&
    /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,/.test(
      normalized
    )
  );
}


function isAllowedJsonScriptAttribute(
  name
) {

  return (
    name === 'type' ||
    name === 'class' ||
    name === 'data-task-tracker-data' ||
    name === 'data-character-effects' ||
    name === 'data-rule-tree-data' ||
    name === 'data-knowledge-graph-view-state'
  );
}


function isTaskTrackerJsonScript(
  element
) {

  return (
    element.hasAttribute('data-task-tracker-data') ||
    element.classList.contains('task-tracker-data')
  );
}


function isCharacterEffectsJsonScript(
  element
) {

  return (
    element.hasAttribute('data-character-effects') ||
    element.classList.contains('character-effects-data')
  );
}


function isRuleTreeJsonScript(
  element
) {

  return (
    element.hasAttribute('data-rule-tree-data') ||
    element.classList.contains('rule-tree-data')
  );
}


function isKnowledgeGraphJsonScript(
  element
) {

  return (
    element.hasAttribute('data-knowledge-graph-view-state') ||
    element.classList.contains('knowledge-graph-view-state')
  );
}


function hardenExternalLink(
  element,
  tagName
) {

  if (
    tagName !== 'a' ||
    element.getAttribute('target') !== '_blank'
  ) return;

  element.setAttribute(
    'rel',
    'noopener noreferrer'
  );
}
