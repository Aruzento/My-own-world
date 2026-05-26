export const RUNTIME_SELECTOR = [
  '[data-runtime="true"]'
].join(',');

export const LEGACY_RUNTIME_SELECTOR = [
  // Fallback для страниц, сохраненных до явного data-runtime.
  '.block-actions',
  '.blocks-toolbar',
  '.block-drop-placeholder',
  '.add-block-row',
  '.backlinks-list',
  '.card-type-custom',
  '.item-set-add-btn',
  '.item-set-remove',
  '.spell-set-add-btn',
  '.spell-set-remove',
  '.skill-set-add-btn',
  '.skill-set-remove',
  '.inline-tag-input',
  '.inline-add-tag-btn',
  '.inline-alias-input',
  '.inline-add-alias-btn',
  '.upload-portrait-btn',
  '.image-upload-btn',
  '.image-runtime-actions',
  '.table-row-controls'
].join(',');

export const RUNTIME_OR_LEGACY_SELECTOR = [
  RUNTIME_SELECTOR,
  LEGACY_RUNTIME_SELECTOR
].join(',');
