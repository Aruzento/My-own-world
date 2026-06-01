import {
  createSchemaIssue,
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from './schemaValidation.js';


export const PAGE_TEMPLATE_SCHEMA_VERSION =
  1;


export function validatePageTemplatesData(
  data
) {

  const issues = [];

  if (Array.isArray(data)) {

    validateTemplateList(
      data,
      issues
    );

    return createValidationResult(
      issues
    );
  }

  if (!isPlainObject(data)) {

    return createValidationResult([
      createSchemaIssue(
        'error',
        'template.invalid_data',
        'Файл шаблонов должен быть объектом или legacy-массивом.'
      )
    ]);
  }

  if (
    data.version !== undefined &&
    Number(data.version) !== PAGE_TEMPLATE_SCHEMA_VERSION
  ) {

    issues.push(
      createSchemaIssue(
        'warning',
        'template.unknown_version',
        'Файл шаблонов использует неизвестную версию схемы.',
        {
          version: data.version
        }
      )
    );
  }

  if (!Array.isArray(data.templates)) {

    issues.push(
      createSchemaIssue(
        'error',
        'template.invalid_templates',
        'Поле templates должно быть массивом.'
      )
    );

    return createValidationResult(
      issues
    );
  }

  validateTemplateList(
    data.templates,
    issues
  );

  return createValidationResult(
    issues
  );
}


function validateTemplateList(
  templates,
  issues
) {

  const ids =
    new Set();

  templates.forEach((template, index) => {

    if (!isPlainObject(template)) {

      issues.push(
        createSchemaIssue(
          'error',
          'template.invalid_record',
          'Шаблон должен быть объектом.',
          {
            index
          }
        )
      );

      return;
    }

    if (!isNonEmptyString(template.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'template.missing_id',
          'Шаблон не имеет стабильного id.',
          {
            index,
            title: template.title || null
          }
        )
      );
    } else if (ids.has(template.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'template.duplicate_id',
          'В файле шаблонов найден дублирующийся id.',
          {
            templateId: template.id
          }
        )
      );
    }

    if (isNonEmptyString(template.id)) {

      ids.add(
        template.id
      );
    }

    if (!isNonEmptyString(template.title)) {

      issues.push(
        createSchemaIssue(
          'warning',
          'template.empty_title',
          'Шаблон имеет пустое название.',
          {
            templateId: template.id || null,
            index
          }
        )
      );
    }

    if (
      template.tags !== undefined &&
      !Array.isArray(template.tags)
    ) {

      issues.push(
        createSchemaIssue(
          'error',
          'template.invalid_tags',
          'Поле tags шаблона должно быть массивом.',
          {
            templateId: template.id || null,
            index
          }
        )
      );
    }

    if (
      template.aliases !== undefined &&
      !Array.isArray(template.aliases)
    ) {

      issues.push(
        createSchemaIssue(
          'error',
          'template.invalid_aliases',
          'Поле aliases шаблона должно быть массивом.',
          {
            templateId: template.id || null,
            index
          }
        )
      );
    }

    if (template.body !== undefined && typeof template.body !== 'string') {

      issues.push(
        createSchemaIssue(
          'error',
          'template.invalid_body',
          'HTML тела шаблона должен быть строкой.',
          {
            templateId: template.id || null,
            index
          }
        )
      );
    }
  });
}
