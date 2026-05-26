import {
  sanitizePersistentHTMLOnSave
} from '../safeHtmlSanitizer.js';

import {
  RUNTIME_OR_LEGACY_SELECTOR
} from './blockRuntimeSelectors.js';

export function serializePersistentEditorHTML(
  editor
) {

  const clone =
    editor.cloneNode(true);

  syncPersistentFormValues(
    editor,
    clone
  );

  removeRuntimeControls(
    clone
  );

  clearRuntimeTableState(
    clone
  );

  clearRuntimeMirrorLists(
    clone
  );

  stripRuntimeAssetSources(
    clone
  );

  stripRuntimeMapBackgrounds(
    clone
  );

  clearRuntimeMapState(
    clone
  );

  return sanitizePersistentHTMLOnSave(
    clone.innerHTML
  );
}

export function removeRuntimeControls(
  root
) {

  const elements =
    root.querySelectorAll(RUNTIME_OR_LEGACY_SELECTOR);

  const removedAny =
    elements.length > 0;

  elements
    .forEach(element => {

      element.remove();
    });

  return removedAny;
}

function clearRuntimeTableState(
  root
) {

  root
    .querySelectorAll('.table-cell.is-selected')
    .forEach(cell => {

      cell.classList.remove(
        'is-selected'
      );
    });

  root
    .querySelectorAll('.custom-table.is-resizing-column')
    .forEach(table => {

      table.classList.remove(
        'is-resizing-column'
      );
    });
}

function clearRuntimeMirrorLists(
  root
) {

  root
    .querySelectorAll(
      '.inline-tag-list, .inline-alias-list'
    )
    .forEach(element => {

      element.innerHTML =
        '';
    });
}

function stripRuntimeAssetSources(
  root
) {

  root
    .querySelectorAll('img[data-asset]')
    .forEach(img => {

      img.removeAttribute(
        'src'
      );
    });
}

function stripRuntimeMapBackgrounds(
  root
) {

  root
    .querySelectorAll('.campaign-map-background')
    .forEach(background => {

      background.removeAttribute(
        'style'
      );
    });

  root
    .querySelectorAll('.campaign-map-token-image')
    .forEach(image => {

      image.removeAttribute(
        'src'
      );
    });
}

function clearRuntimeMapState(
  root
) {

  root
    .querySelectorAll(
      '.campaign-map-token.is-offscreen, .campaign-map-shape.is-offscreen'
    )
    .forEach(element => {

      element.classList.remove(
        'is-offscreen'
      );
    });
}

function syncPersistentFormValues(
  source,
  clone
) {

  const sourceFields =
    source.querySelectorAll(
      'input, textarea, select'
    );

  const cloneFields =
    clone.querySelectorAll(
      'input, textarea, select'
    );

  sourceFields.forEach((sourceField, index) => {

    const cloneField =
      cloneFields[index];

    if (!cloneField) return;

    if (
      isRuntimeField(sourceField)
    ) {

      return;
    }

    syncFieldValue(
      sourceField,
      cloneField
    );
  });
}

function syncFieldValue(
  sourceField,
  cloneField
) {

  if (
    sourceField.tagName === 'INPUT'
  ) {

    cloneField.setAttribute(
      'value',
      sourceField.value
    );

    if (
      sourceField.type === 'checkbox'
    ) {

      if (sourceField.checked) {

        cloneField.setAttribute(
          'checked',
          'checked'
        );

      } else {

        cloneField.removeAttribute(
          'checked'
        );
      }
    }
  }

  if (
    sourceField.tagName === 'TEXTAREA'
  ) {

    cloneField.textContent =
      sourceField.value;
  }

  if (
    sourceField.tagName === 'SELECT'
  ) {

    syncSelectValue(
      sourceField,
      cloneField
    );
  }
}

function syncSelectValue(
  sourceField,
  cloneField
) {

  cloneField
    .querySelectorAll('option')
    .forEach(option => {

      option.removeAttribute(
        'selected'
      );

      if (
        option.value === sourceField.value
      ) {

        option.setAttribute(
          'selected',
          'selected'
        );
      }
    });
}

function isRuntimeField(
  field
) {

  return Boolean(
    field.closest(
      RUNTIME_OR_LEGACY_SELECTOR
    )
  );
}
