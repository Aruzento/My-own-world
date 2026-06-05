import {
  createSchemaIssue,
  createValidationResult,
  isNonEmptyString
} from './schemaValidation.js';

import {
  normalizePageTitle
} from '../validation/pageTitleValidation.js';


const KNOWN_TEMPLATES =
  new Set([
    'card',
    'campaignMap',
    'taskTracker',
    'ruleTree'
  ]);


export function validatePageRecord(
  page,
  context = {}
) {

  const issues = [];
  const pageId =
    page?.id;

  if (!isNonEmptyString(pageId)) {

    issues.push(
      createSchemaIssue(
        'error',
        'page.missing_id',
        'Страница не имеет стабильного id.',
        {
          pageName: page?.name || null
        }
      )
    );
  }

  if (!isNonEmptyString(page?.title)) {

    issues.push(
      createSchemaIssue(
        'warning',
        'page.empty_title',
        'Страница имеет пустое название.',
        {
          pageId: pageId || null
        }
      )
    );
  }

  if (
    page?.parent !== null &&
    page?.parent !== undefined &&
    !context.pageIds?.has(page.parent)
  ) {

    issues.push(
      createSchemaIssue(
        'error',
        'page.broken_parent',
        'Страница ссылается на несуществующего родителя.',
        {
          pageId: pageId || null,
          parent: page.parent
        }
      )
    );
  }

  if (
    page?.template &&
    !KNOWN_TEMPLATES.has(page.template)
  ) {

    issues.push(
      createSchemaIssue(
        'warning',
        'page.unknown_template',
        'Страница использует неизвестный template. Возможно, это legacy-страница или новый тип без контракта.',
        {
          pageId: pageId || null,
          template: page.template
        }
      )
    );
  }

  if (
    page?.tags !== undefined &&
    !Array.isArray(page.tags)
  ) {

    issues.push(
      createSchemaIssue(
        'error',
        'page.invalid_tags',
        'Поле tags должно быть массивом строк.',
        {
          pageId: pageId || null
        }
      )
    );
  }

  if (
    page?.aliases !== undefined &&
    !Array.isArray(page.aliases)
  ) {

    issues.push(
      createSchemaIssue(
        'error',
        'page.invalid_aliases',
        'Поле aliases должно быть массивом строк.',
        {
          pageId: pageId || null
        }
      )
    );
  }

  return createValidationResult(
    issues
  );
}


export function validatePageCollection(
  pages = []
) {

  const issues = [];
  const pageIds =
    new Set();
  const titleIndex =
    new Map();

  pages.forEach(page => {

    if (!isNonEmptyString(page?.id)) return;

    if (pageIds.has(page.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'page.duplicate_id',
          'В workspace найден дублирующийся id страницы.',
          {
            pageId: page.id
          }
        )
      );
    }

    pageIds.add(
      page.id
    );
  });

  pages.forEach(page => {

    issues.push(
      ...validatePageRecord(
        page,
        {
          pageIds
        }
      ).issues
    );

    const normalizedTitle =
      normalizePageTitle(
        page?.title || ''
      );

    if (!normalizedTitle) return;

    const titlePages =
      titleIndex.get(normalizedTitle) || [];

    titlePages.push(
      page?.id || null
    );

    titleIndex.set(
      normalizedTitle,
      titlePages
    );
  });

  for (const [title, ids] of titleIndex.entries()) {

    if (ids.length < 2) continue;

    issues.push(
      createSchemaIssue(
        'warning',
        'page.duplicate_title',
        'В workspace есть несколько страниц с одинаковым названием.',
        {
          title,
          pageIds: ids
        }
      )
    );
  }

  issues.push(
    ...findParentCycles(
      pages
    )
  );

  return createValidationResult(
    issues
  );
}


function findParentCycles(
  pages
) {

  const issues = [];
  const byId =
    new Map(
      pages
        .filter(page => isNonEmptyString(page?.id))
        .map(page => [page.id, page])
    );

  for (const page of pages) {

    const seen =
      new Set();
    let cursor =
      page;

    while (cursor?.parent) {

      if (seen.has(cursor.id)) {

        issues.push(
          createSchemaIssue(
            'error',
            'page.parent_cycle',
            'В parent-chain страницы найден цикл.',
            {
              pageId: page.id
            }
          )
        );

        break;
      }

      seen.add(
        cursor.id
      );

      cursor =
        byId.get(
          cursor.parent
        );
    }
  }

  return issues;
}
