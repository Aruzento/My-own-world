export const PROPERTY_LAYOUT_COLUMNS =
  12;

export const PROPERTY_LAYOUT_DEFAULT_WIDTH =
  4;

export const PROPERTY_LAYOUT_MIN_WIDTH =
  1;

export const PROPERTY_LAYOUT_MIN_HEIGHT =
  1;

export const PROPERTY_LAYOUT_MAX_HEIGHT =
  8;


// Layout-модель описывает положение поля как данные, а не как побочный эффект DOM.
export function normalizePropertyLayout(
  value = {},
  fallback = {}
) {

  const width =
    clampLayoutNumber(
      value.w ?? value.width ?? fallback.w ?? fallback.width,
      PROPERTY_LAYOUT_MIN_WIDTH,
      PROPERTY_LAYOUT_COLUMNS,
      fallback.w ?? PROPERTY_LAYOUT_DEFAULT_WIDTH
    );

  const height =
    clampLayoutNumber(
      value.h ?? value.height ?? fallback.h ?? fallback.height,
      PROPERTY_LAYOUT_MIN_HEIGHT,
      PROPERTY_LAYOUT_MAX_HEIGHT,
      fallback.h ?? PROPERTY_LAYOUT_MIN_HEIGHT
    );

  return {
    x:
      clampLayoutNumber(
        value.x ?? fallback.x,
        0,
        PROPERTY_LAYOUT_COLUMNS - width,
        0
      ),
    y:
      Math.max(
        0,
        Math.round(
          Number(value.y ?? fallback.y ?? 0)
        ) || 0
      ),
    w:
      width,
    h:
      height,
    order:
      Math.max(
        0,
        Math.round(
          Number(value.order ?? fallback.order ?? 0)
        ) || 0
      ),
    collapsed:
      Boolean(
        value.collapsed ?? fallback.collapsed ?? false
      ),
    groupId:
      normalizeGroupId(
        value.groupId ?? fallback.groupId
      )
  };
}


export function parsePropertyLayout(
  raw,
  fallback = {}
) {

  if (!raw) {

    return normalizePropertyLayout(
      {},
      fallback
    );
  }

  try {

    return normalizePropertyLayout(
      JSON.parse(
        String(raw)
      ),
      fallback
    );
  } catch {

    return normalizePropertyLayout(
      {},
      fallback
    );
  }
}


export function serializePropertyLayout(
  layout
) {

  const normalized =
    normalizePropertyLayout(
      layout
    );

  return JSON.stringify({
    x:
      normalized.x,
    y:
      normalized.y,
    w:
      normalized.w,
    h:
      normalized.h,
    order:
      normalized.order,
    collapsed:
      normalized.collapsed,
    groupId:
      normalized.groupId
  });
}


export function readPropertyLayoutFromField(
  field,
  fallback = {}
) {

  const span =
    Number(
      field?.dataset?.propertySpan
    );

  const rows =
    Number(
      field?.dataset?.propertyRows
    );

  return parsePropertyLayout(
    field?.dataset?.propertyLayout,
    {
      ...fallback,
      w:
        Number.isFinite(span)
          ? span
          : fallback.w,
      h:
        Number.isFinite(rows)
          ? rows
          : fallback.h
    }
  );
}


export function writePropertyLayoutToField(
  field,
  layout
) {

  if (!field) return null;

  const normalized =
    normalizePropertyLayout(
      layout
    );

  field.dataset.propertyLayout =
    serializePropertyLayout(
      normalized
    );

  field.dataset.propertyX =
    String(
      normalized.x
    );

  field.dataset.propertyY =
    String(
      normalized.y
    );

  field.dataset.propertySpan =
    String(
      normalized.w
    );

  field.dataset.propertyRows =
    String(
      normalized.h
    );

  field.dataset.propertyOrder =
    String(
      normalized.order
    );

  if (normalized.groupId) {

    field.dataset.propertyGroupId =
      normalized.groupId;
  } else {

    delete field.dataset.propertyGroupId;
  }

  field.dataset.propertyCollapsed =
    normalized.collapsed
      ? 'true'
      : 'false';

  return normalized;
}


function clampLayoutNumber(
  value,
  min,
  max,
  fallback
) {

  const number =
    Math.round(
      Number(value)
    );

  if (!Number.isFinite(number)) {

    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      number
    )
  );
}


function normalizeGroupId(
  value
) {

  const groupId =
    String(value || '')
      .trim();

  return groupId || null;
}
