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

const CONTROL_CHARS_EXCEPT_TEXT_FLOW =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;


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


function sanitizePersistentHTML(
  html,
  options = {}
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    String(html || '');

  removeRuntimeElements(
    wrapper
  );

  sanitizeElementTree(
    wrapper,
    options
  );

  return wrapper.innerHTML;
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
        name.startsWith('on')
      ) {

        element.removeAttribute(
          attribute.name
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

  hardenExternalLink(
    element,
    tagName
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
    normalized.startsWith('blob:') &&
    (
      options.boundary === 'save' ||
      options.tagName === 'img'
    )
  ) return true;

  return false;
}


function isAllowedJsonScriptAttribute(
  name
) {

  return (
    name === 'type' ||
    name === 'class' ||
    name === 'data-task-tracker-data' ||
    name === 'data-character-effects' ||
    name === 'data-rule-tree-data'
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
