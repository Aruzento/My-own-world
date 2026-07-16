import {
  createSchemaIssue,
  createValidationResult,
  isFiniteNumber,
  isNonEmptyString,
  isPlainObject
} from './schemaValidation.js';

import {
  createSchemaVersionState
} from './schemaVersions.js';


export function validateCampaignMapData(
  data
) {

  const issues = [];

  if (!isPlainObject(data)) {

    return createValidationResult([
      createSchemaIssue(
        'error',
        'map.invalid_data',
        'Данные карты должны быть объектом.'
      )
    ]);
  }

  validateVersion(
    data.version,
    issues
  );

  if (!isFiniteNumber(data.version)) {

    issues.push(
      createSchemaIssue(
        'warning',
        'map.missing_version',
        'Карта не содержит числовую версию схемы.'
      )
    );
  }

  validateGrid(
    data.grid,
    issues
  );

  validateView(
    data.view,
    issues
  );

  validateLayers(
    data.layers,
    issues
  );

  validateTokens(
    data.tokens,
    issues
  );

  validateShapes(
    data.shapes,
    issues
  );

  validateFog(
    data.fog,
    issues
  );

  return createValidationResult(
    issues
  );
}


function validateVersion(
  version,
  issues
) {

  const versionState =
    createSchemaVersionState({
      area:
        'campaignMap',
      version
    });

  if (versionState.isFuture) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.future_schema_version',
        'Campaign map uses a newer schema version.',
        versionState
      )
    );
  }
}


function validateGrid(
  grid,
  issues
) {

  if (!isPlainObject(grid)) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_grid',
        'Настройки сетки карты должны быть объектом.'
      )
    );

    return;
  }

  if (!isFiniteNumber(grid.size) || Number(grid.size) <= 0) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_grid_size',
        'Размер сетки карты должен быть положительным числом.'
      )
    );
  }
}


function validateView(
  view,
  issues
) {

  if (!isPlainObject(view)) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_view',
        'Viewport карты должен быть объектом.'
      )
    );

    return;
  }

  ['x', 'y', 'zoom'].forEach(field => {

    if (!isFiniteNumber(view[field])) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.invalid_view_metric',
          'Viewport карты содержит нечисловое значение.',
          {
            field
          }
        )
      );
    }
  });
}


function validateLayers(
  layers,
  issues
) {

  if (!Array.isArray(layers)) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_layers',
        'Слои карты должны быть массивом.'
      )
    );

    return;
  }

  const ids =
    new Set();

  layers.forEach((layer, index) => {

    const layerId =
      layer?.layerId || layer?.id;

    if (!isNonEmptyString(layerId)) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.layer_missing_id',
          'Слой карты не имеет id.',
          {
            index
          }
        )
      );

      return;
    }

    if (ids.has(layerId)) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.layer_duplicate_id',
          'Слой карты имеет дублирующийся id.',
          {
            layerId
          }
        )
      );
    }

    ids.add(
      layerId
    );
  });
}


function validateTokens(
  tokens,
  issues
) {

  if (!Array.isArray(tokens)) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_tokens',
        'Токены карты должны быть массивом.'
      )
    );

    return;
  }

  tokens.forEach((token, index) => {

    if (!isNonEmptyString(token?.tokenId)) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.token_missing_id',
          'Токен карты не имеет tokenId.',
          {
            index
          }
        )
      );
    }

    if (!isNonEmptyString(token?.pageId)) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.token_missing_page',
          'Токен карты не связан со страницей.',
          {
            tokenId: token?.tokenId || null,
            index
          }
        )
      );
    }

    if (!isFiniteNumber(token?.size) || Number(token.size) <= 0) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.token_invalid_size',
          'Размер токена карты должен быть положительным числом.',
          {
            tokenId: token?.tokenId || null,
            index
          }
        )
      );
    }
  });
}


function validateShapes(
  shapes,
  issues
) {

  if (!Array.isArray(shapes)) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_shapes',
        'Фигуры карты должны быть массивом.'
      )
    );

    return;
  }

  shapes.forEach((shape, index) => {

    if (!isNonEmptyString(shape?.shapeId)) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.shape_missing_id',
          'Фигура карты не имеет shapeId.',
          {
            index
          }
        )
      );
    }

    if (!isFiniteNumber(shape?.width) || Number(shape.width) <= 0) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.shape_invalid_width',
          'Ширина фигуры должна быть положительным числом.',
          {
            shapeId: shape?.shapeId || null,
            index
          }
        )
      );
    }

    if (!isFiniteNumber(shape?.height) || Number(shape.height) <= 0) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.shape_invalid_height',
          'Высота фигуры должна быть положительным числом.',
          {
            shapeId: shape?.shapeId || null,
            index
          }
        )
      );
    }
  });
}


function validateFog(
  fog,
  issues
) {

  if (!isPlainObject(fog)) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_fog',
        'Данные тумана должны быть объектом.'
      )
    );

    return;
  }

  if (
    fog.lockedZones !== undefined &&
    !Array.isArray(fog.lockedZones)
  ) {

    issues.push(
      createSchemaIssue(
        'error',
        'map.invalid_locked_fog_zones',
        'Запретные зоны тумана должны быть массивом.'
      )
    );

    return;
  }

  (fog.lockedZones || []).forEach((zone, index) => {

    if (!isNonEmptyString(zone?.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'map.locked_fog_zone_missing_id',
          'Запретная зона тумана не имеет id.',
          {
            index
          }
        )
      );
    }
  });
}
