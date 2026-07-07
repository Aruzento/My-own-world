import {
  normalizeWorkspacePath
} from '../storage/storageAdapterContract.js';

import {
  createSchemaIssue,
  createValidationResult,
  isPlainObject
} from '../schema/schemaValidation.js';

import {
  normalizePageTitle
} from '../validation/pageTitleValidation.js';


export const WORLD_PACKAGE_VERSION =
  1;


export function normalizeWorldPackageData(
  data = {}
) {

  const source =
    isPlainObject(data)
      ? data
      : {};

  const now =
    new Date().toISOString();

  const packageId =
    createSafeWorldPackageId(
      source.packageId ||
      source.id ||
      source.title ||
      'world-package'
    );

  const metadata =
    isPlainObject(source.metadata)
      ? source.metadata
      : {};

  const contents =
    isPlainObject(source.contents)
      ? source.contents
      : {};

  return {
    version:
      Number(source.version) || WORLD_PACKAGE_VERSION,
    packageId,
    title:
      String(source.title || packageId).trim() || packageId,
    description:
      String(source.description || '').trim(),
    createdAt:
      String(source.createdAt || now),
    updatedAt:
      String(source.updatedAt || source.createdAt || now),
    scope:
      normalizePackageScope(
        source.scope
      ),
    metadata: {
      author:
        String(metadata.author || '').trim(),
      tags:
        normalizeStringArray(
          metadata.tags
        ),
      license:
        String(metadata.license || '').trim()
    },
    fork: normalizeForkMetadata(
      source.fork
    ),
    dependencies:
      normalizePackageDependencies(
        source.dependencies
      ),
    contents: {
      pages:
        normalizePackagePages(
          contents.pages
        ),
      assets:
        normalizePackageAssets(
          contents.assets
        ),
      rulePackages:
        normalizeRulePackages(
          contents.rulePackages
        )
    }
  };
}


export function createWorldPackageFromPages(
  pages = [],
  options = {}
) {

  const title =
    options.title ||
    'World Package';

  return normalizeWorldPackageData({
    packageId:
      options.packageId || title,
    title,
    description:
      options.description || '',
    scope:
      options.scope || 'selection',
    metadata:
      options.metadata || {},
    fork:
      options.fork || null,
    dependencies:
      options.dependencies || [],
    contents: {
      pages:
        pages.map(page =>
          createPackagePageRecord(
            page
          )
        ),
      assets:
        options.assets || [],
      rulePackages:
        options.rulePackages || []
    }
  });
}


export function validateWorldPackageData(
  data
) {

  const pkg =
    normalizeWorldPackageData(
      data
    );

  const issues =
    [];

  if (!pkg.packageId) {

    issues.push(
      createSchemaIssue(
        'error',
        'worldPackage.missing_package_id',
        'World package must have a packageId.'
      )
    );
  }

  if (!pkg.title) {

    issues.push(
      createSchemaIssue(
        'error',
        'worldPackage.missing_title',
        'World package must have a readable title.'
      )
    );
  }

  const pageIds =
    new Set();

  for (const page of pkg.contents.pages) {

    if (!page.id) {

      issues.push(
        createSchemaIssue(
          'error',
          'worldPackage.page_missing_id',
          'World package page must have id.',
          {
            title: page.title
          }
        )
      );
    }

    if (pageIds.has(page.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'worldPackage.duplicate_page_id',
          'World package contains duplicated page id.',
          {
            pageId: page.id
          }
        )
      );
    }

    pageIds.add(
      page.id
    );

    if (!page.title) {

      issues.push(
        createSchemaIssue(
          'warning',
          'worldPackage.page_empty_title',
          'World package page has empty title.',
          {
            pageId: page.id
          }
        )
      );
    }
  }

  for (const page of pkg.contents.pages) {

    if (
      page.parent &&
      !pageIds.has(page.parent)
    ) {

      issues.push(
        createSchemaIssue(
          'warning',
          'worldPackage.parent_outside_package',
          'World package page points to parent outside package.',
          {
            pageId: page.id,
            parent: page.parent
          }
        )
      );
    }
  }

  return createValidationResult(
    issues
  );
}


export function createWorldPackageImportPreview({
  packageData,
  existingPages = []
} = {}) {

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  const validation =
    validateWorldPackageData(
      pkg
    );

  const existingById =
    new Map(
      existingPages
        .filter(page => page?.id)
        .map(page => [page.id, page])
    );

  const existingByTitle =
    new Map();

  for (const page of existingPages) {

    const title =
      normalizePageTitle(
        page?.title || ''
      );

    if (!title) continue;

    existingByTitle.set(
      title,
      page
    );
  }

  const pageConflicts =
    [];

  const newPages =
    [];

  for (const page of pkg.contents.pages) {

    const existingByPageId =
      existingById.get(
        page.id
      );

    const existingByPageTitle =
      existingByTitle.get(
        normalizePageTitle(
          page.title
        )
      );

    if (
      existingByPageId ||
      existingByPageTitle
    ) {

      pageConflicts.push({
        pageId:
          page.id,
        title:
          page.title,
        reason:
          existingByPageId
            ? 'id'
            : 'title',
        existingPageId:
          existingByPageId?.id ||
          existingByPageTitle?.id ||
          null
      });

      continue;
    }

    newPages.push(
      page
    );
  }

  return {
    packageId:
      pkg.packageId,
    title:
      pkg.title,
    ok:
      validation.ok,
    requiresBackup:
      true,
    validation,
    counts: {
      pages:
        pkg.contents.pages.length,
      assets:
        pkg.contents.assets.length,
      rulePackages:
        pkg.contents.rulePackages.length,
      dependencies:
        pkg.dependencies.length,
      conflicts:
        pageConflicts.length
    },
    newPages:
      newPages.map(page => ({
        id:
          page.id,
        title:
          page.title,
        template:
          page.template,
        type:
          page.type
      })),
    conflicts: {
      pages:
        pageConflicts
    },
    actions: [
      'review-preview',
      'create-backup',
      'import-pages',
      'import-assets',
      'validate-workspace'
    ]
  };
}


export function createWorldPackageDependencyReport(
  packageData
) {

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  return {
    packageId:
      pkg.packageId,
    dependencies:
      pkg.dependencies.map(dependency => ({
        ...dependency,
        required:
          dependency.required !== false
      })),
    missingRequired:
      pkg.dependencies
        .filter(dependency =>
          dependency.required !== false
        )
        .filter(dependency =>
          !dependency.resolved
        )
  };
}


export function createSafeWorldPackageId(
  value
) {

  return String(value || 'world-package')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/giu, '-')
    .replace(/^-+|-+$/g, '') ||
    'world-package';
}


function createPackagePageRecord(
  page = {}
) {

  return {
    id:
      String(page.id || '').trim(),
    title:
      String(page.title || '').trim(),
    parent:
      page.parent ?? null,
    order:
      Number.isFinite(Number(page.order))
        ? Number(page.order)
        : 0,
    template:
      String(page.template || 'card').trim(),
    type:
      String(page.type || 'note').trim(),
    tags:
      normalizeStringArray(
        page.tags
      ),
    aliases:
      normalizeStringArray(
        page.aliases
      ),
    body:
      String(page.body || page.content || '').trim()
  };
}


function normalizePackagePages(
  pages
) {

  return Array.isArray(pages)
    ? pages.map(createPackagePageRecord)
    : [];
}


function normalizePackageAssets(
  assets
) {

  if (!Array.isArray(assets)) return [];

  return assets
    .map(asset => {

      if (!isPlainObject(asset)) {

        return null;
      }

      return {
        path:
          normalizeWorkspacePath(
            asset.path || ''
          ),
        type:
          String(asset.type || 'futureMedia').trim(),
        owner:
          asset.owner || null,
        required:
          asset.required !== false
      };
    })
    .filter(asset =>
      asset?.path
    );
}


function normalizeRulePackages(
  rulePackages
) {

  if (!Array.isArray(rulePackages)) return [];

  return rulePackages
    .map(rulePackage => {

      if (!isPlainObject(rulePackage)) {

        return null;
      }

      return {
        packageId:
          createSafeWorldPackageId(
            rulePackage.packageId ||
            rulePackage.id ||
            'rules'
          ),
        title:
          String(rulePackage.title || rulePackage.packageId || 'Rules').trim(),
        data:
          isPlainObject(rulePackage.data)
            ? rulePackage.data
            : {}
      };
    })
    .filter(Boolean);
}


function normalizePackageDependencies(
  dependencies
) {

  if (!Array.isArray(dependencies)) return [];

  return dependencies
    .map(dependency => {

      if (!isPlainObject(dependency)) {

        return null;
      }

      return {
        packageId:
          createSafeWorldPackageId(
            dependency.packageId ||
            dependency.id ||
            'dependency'
          ),
        title:
          String(dependency.title || '').trim(),
        version:
          String(dependency.version || '').trim(),
        required:
          dependency.required !== false,
        resolved:
          Boolean(dependency.resolved)
      };
    })
    .filter(Boolean);
}


function normalizeForkMetadata(
  fork
) {

  if (!isPlainObject(fork)) {

    return null;
  }

  return {
    originPackageId:
      fork.originPackageId
        ? createSafeWorldPackageId(
          fork.originPackageId
        )
        : null,
    originVersion:
      String(fork.originVersion || '').trim(),
    forkedAt:
      fork.forkedAt
        ? String(fork.forkedAt)
        : null,
    notes:
      String(fork.notes || '').trim()
  };
}


function normalizePackageScope(
  scope
) {

  const value =
    String(scope || 'selection').trim();

  return [
    'selection',
    'character',
    'location',
    'region',
    'campaign',
    'world',
    'rules'
  ].includes(value)
    ? value
    : 'selection';
}


function normalizeStringArray(
  value
) {

  return Array.isArray(value)
    ? value
      .map(item =>
        String(item || '').trim()
      )
      .filter(Boolean)
    : [];
}
