import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

import {
  buildWorkspaceAccessMatrix,
  classifyWorkspaceLocation,
  normalizeWorkspaceAccessError
} from '../js/storage/workspaceAccessDiagnostics.js';


const args =
  parseArgs(
    process.argv.slice(2)
  );

const workspace =
  args.workspace || args._[0];

const outputJson =
  parseBooleanFlag(
    args.json,
    true
  );

if (!workspace) {

  console.error(
    'Usage: node tools/run_workspace_diagnostics.mjs --workspace "X:\\path\\to\\workspace"'
  );

  process.exit(1);
}

const startedAt =
  performance.now();

const diagnostics =
  await runDiagnostics(
    path.resolve(
      workspace
    ),
    {
      writeProbe:
        args['no-write-probe'] !== true &&
        args['write-probe'] !== 'false'
    }
  );

diagnostics.durationMs =
  Math.round(
    performance.now() - startedAt
  );

if (outputJson) {

  console.log(
    JSON.stringify(
      diagnostics,
      null,
      2
    )
  );

} else {

  printHumanReport(
    diagnostics
  );
}

if (diagnostics.errors.length) {

  process.exitCode =
    1;
}


async function runDiagnostics(
  root,
  options = {}
) {

  const pagesDir =
    path.join(
      root,
      'pages'
    );

  const assetsDir =
    path.join(
      root,
      'assets'
    );

  const backupsDir =
    path.join(
      root,
      '.my-own-world-backups'
    );

  const errors =
    [];

  const access =
    await inspectWorkspaceAccess(
      root,
      options
    );

  if (access.error) {

    errors.push({
      code:
        access.error.code,
      message:
        access.error.userMessage,
      path:
        access.error.path || root
    });
  }

  const pages =
    await readPages(
      pagesDir,
      errors
    );

  const assetFiles =
    await readFilesRecursive(
      assetsDir
    );

  const backupHealth =
    await inspectBackups(
      backupsDir
    );

  const assetReferences =
    collectAssetReferences(
      pages
    );

  const existingAssets =
    new Set(
      assetFiles.map(file =>
        normalizeRelativePath(
          file.relativePath
        )
      )
    );

  const missingAssetReferences =
    assetReferences.filter(reference =>
      !existingAssets.has(
        normalizeRelativePath(
          reference.path
        )
      )
    );

  const largestPages =
    pages
      .slice()
      .sort((a, b) =>
        b.sizeBytes - a.sizeBytes
      )
      .slice(
        0,
        12
      )
      .map(page => ({
        id:
          page.id,
        title:
          page.title,
        template:
          page.template,
        type:
          page.type,
        sizeBytes:
          page.sizeBytes,
        file:
          page.file
      }));

  const largestAssets =
    assetFiles
      .slice()
      .sort((a, b) =>
        b.sizeBytes - a.sizeBytes
      )
      .slice(
        0,
        12
      );

  const templates =
    countBy(
      pages,
      page =>
        page.template || 'unknown'
    );

  const types =
    countBy(
      pages,
      page =>
        page.type || 'unknown'
    );

  const heavyMaps =
    pages
      .filter(page =>
        page.template === 'campaignMap'
      )
      .map(page =>
        inspectMapPage(
          page
        )
      )
      .sort((a, b) =>
        b.score - a.score
      )
      .slice(
        0,
        12
      );

  const warnings =
    buildWarnings({
      pages,
      assetFiles,
      backupHealth,
      missingAssetReferences,
      heavyMaps
    });

  return {
    workspace:
      root,
    summary: {
      pageCount:
        pages.length,
      rootPageCount:
        pages.filter(page =>
          !page.parent
        ).length,
      campaignMapCount:
        templates.campaignMap || 0,
      taskTrackerCount:
        templates.taskTracker || 0,
      ruleTreeCount:
        templates.ruleTree || 0,
      assetFileCount:
        assetFiles.length,
      assetTotalBytes:
        sum(
          assetFiles,
          file =>
            file.sizeBytes
        ),
      assetReferenceCount:
        assetReferences.length,
      missingAssetReferenceCount:
        missingAssetReferences.length,
      completeBackupCount:
        backupHealth.completeCount,
      incompleteBackupCount:
        backupHealth.incompleteCount,
      warningCount:
        warnings.length,
      accessWarnings:
        access.matrix.filter(row =>
          [
            'blocked',
            'unknown',
            'needs-real-hardware'
          ].includes(
            row.status
          )
        ).length
    },
    access,
    templates,
    types,
    largestPages,
    largestAssets,
    missingAssetReferences:
      missingAssetReferences.slice(
        0,
        30
      ),
    heavyMaps,
    backupHealth,
    warnings,
    errors
  };
}


async function inspectWorkspaceAccess(
  root,
  options
) {

  const location =
    classifyWorkspaceLocation(
      root,
      {
        homePath:
          os.homedir(),
        platform:
          process.platform
      }
    );

  let hasAccess =
    false;

  let canWrite =
    null;

  let error =
    null;

  let writeProbe =
    {
      attempted:
        false,
      ok:
        null,
      message:
        'Write probe was not run.'
    };

  try {

    const stats =
      await fs.stat(
        root
      );

    hasAccess =
      stats.isDirectory();

    if (!hasAccess) {

      throw Object.assign(
        new Error('Workspace path is not a directory.'),
        {
          code:
            'workspace.not_directory',
          path:
            root
        }
      );
    }

    await fs.access(
      root
    );

    if (options.writeProbe !== false) {

      writeProbe =
        await runNodeWriteProbe(
          root
        );

      canWrite =
        writeProbe.ok === true;

      if (!writeProbe.ok) {

        error =
          normalizeWorkspaceAccessError({
            code:
              writeProbe.code,
            message:
              writeProbe.rawMessage || writeProbe.message,
            path:
              writeProbe.path
          });
      }
    }

  } catch (accessError) {

    error =
      normalizeWorkspaceAccessError(
        accessError
      );

    canWrite =
      false;
  }

  const matrix =
    buildWorkspaceAccessMatrix({
      location,
      hasAccess,
      canWrite,
      writeProbe
    });

  return {
    path:
      root,
    hasAccess,
    canWrite:
      canWrite === true,
    canWriteKnown:
      canWrite !== null,
    location,
    writeProbe,
    matrix,
    error
  };
}


async function runNodeWriteProbe(
  root
) {

  const probePath =
    path.join(
      root,
      `.my-own-world-write-probe-${process.pid}.tmp`
    );

  const content =
    `my-own-world-write-probe:${Date.now()}`;

  try {

    await fs.writeFile(
      probePath,
      content,
      'utf8'
    );

    const readBack =
      await fs.readFile(
        probePath,
        'utf8'
      );

    const cleanupOk =
      await removeProbeFile(
        probePath
      );

    if (readBack !== content) {

      return {
        attempted:
          true,
        ok:
          false,
        code:
          'workspace.write_probe_mismatch',
        path:
          probePath,
        message:
          'Write probe created a file but read different content back.',
        cleanupOk
      };
    }

    return {
      attempted:
        true,
      ok:
        true,
      code:
        cleanupOk
          ? ''
          : 'workspace.write_probe_cleanup_failed',
      path:
        probePath,
      message:
        cleanupOk
          ? 'Write probe OK.'
          : 'Write probe OK, but cleanup failed.',
      cleanupOk
    };

  } catch (probeError) {

    await removeProbeFile(
      probePath
    );

    const normalized =
      normalizeWorkspaceAccessError(
        probeError
      );

    return {
      attempted:
        true,
      ok:
        false,
      code:
        normalized.code,
      path:
        probePath,
      message:
        normalized.userMessage,
      rawMessage:
        normalized.message,
      cleanupOk:
        true
    };
  }
}


async function removeProbeFile(
  probePath
) {

  try {

    await fs.rm(
      probePath,
      {
        force:
          true
      }
    );

    return true;

  } catch {

    return false;
  }
}


async function readPages(
  pagesDir,
  errors
) {

  let entries;

  try {

    entries =
      await fs.readdir(
        pagesDir,
        {
          withFileTypes: true
        }
      );

  } catch (error) {

    errors.push({
      code:
        'pages_read_failed',
      message:
        error.message
    });

    return [];
  }

  const pages =
    [];

  for (const entry of entries) {

    if (
      !entry.isFile() ||
      !entry.name.toLowerCase().endsWith('.md')
    ) continue;

    const filePath =
      path.join(
        pagesDir,
        entry.name
      );

    try {

      const [content, stats] =
        await Promise.all([
          fs.readFile(
            filePath,
            'utf8'
          ),
          fs.stat(
            filePath
          )
        ]);

      pages.push(
        parsePage({
          file:
            entry.name,
          content,
          sizeBytes:
            stats.size
        })
      );

    } catch (error) {

      errors.push({
        code:
          'page_read_failed',
        file:
          entry.name,
        message:
          error.message
      });
    }
  }

  return pages;
}


async function readFilesRecursive(
  directory,
  base = directory
) {

  let entries;

  try {

    entries =
      await fs.readdir(
        directory,
        {
          withFileTypes: true
        }
      );

  } catch {

    return [];
  }

  const files =
    [];

  for (const entry of entries) {

    const fullPath =
      path.join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {

      files.push(
        ...await readFilesRecursive(
          fullPath,
          base
        )
      );

      continue;
    }

    if (!entry.isFile()) continue;

    const stats =
      await fs.stat(
        fullPath
      );

    files.push({
      relativePath:
        normalizeRelativePath(
          path.relative(
            base,
            fullPath
          )
        ),
      sizeBytes:
        stats.size,
      modifiedAt:
        stats.mtime.toISOString()
    });
  }

  return files;
}


async function inspectBackups(
  backupsDir
) {

  let entries;

  try {

    entries =
      await fs.readdir(
        backupsDir,
        {
          withFileTypes: true
        }
      );

  } catch {

    return {
      directory:
        backupsDir,
      completeCount:
        0,
      incompleteCount:
        0,
      complete:
        [],
      incomplete:
        []
    };
  }

  const complete =
    [];

  const incomplete =
    [];

  for (const entry of entries) {

    if (!entry.isDirectory()) continue;

    const backupPath =
      path.join(
        backupsDir,
        entry.name
      );

    const manifestPath =
      path.join(
        backupPath,
        'manifest.json'
      );

    try {

      const manifest =
        JSON.parse(
          await fs.readFile(
            manifestPath,
            'utf8'
          )
        );

      complete.push({
        id:
          entry.name,
        createdAt:
          manifest.createdAt || null,
        pageCount:
          manifest.pageCount ?? null,
        assetCount:
          manifest.assetCount ?? null,
        sizeBytes:
          manifest.sizeBytes ?? null
      });

    } catch {

      const files =
        await readFilesRecursive(
          backupPath
        );

      incomplete.push({
        id:
          entry.name,
        sizeBytes:
          sum(
            files,
            file =>
              file.sizeBytes
          )
      });
    }
  }

  complete.sort((a, b) =>
    String(b.createdAt || '').localeCompare(
      String(a.createdAt || '')
    )
  );

  return {
    directory:
      backupsDir,
    completeCount:
      complete.length,
    incompleteCount:
      incomplete.length,
    complete:
      complete.slice(
        0,
        12
      ),
    incomplete
  };
}


function parsePage({
  file,
  content,
  sizeBytes
}) {

  const frontmatter =
    parseFrontmatter(
      content
    );

  return {
    file,
    id:
      frontmatter.id || file.replace(/\.md$/i, ''),
    title:
      frontmatter.title || file.replace(/\.md$/i, ''),
    template:
      frontmatter.template || 'card',
    type:
      frontmatter.type || '',
    parent:
      normalizeParent(
        frontmatter.parent
      ),
    tags:
      parseListValue(
        frontmatter.tags
      ),
    aliases:
      parseListValue(
        frontmatter.aliases
      ),
    sizeBytes,
    content
  };
}


function parseFrontmatter(
  content
) {

  if (!content.startsWith('---')) return {};

  const end =
    content.indexOf(
      '\n---',
      3
    );

  if (end === -1) return {};

  const raw =
    content.slice(
      3,
      end
    );

  const fields =
    {};

  for (const line of raw.split(/\r?\n/)) {

    const match =
      line.match(
        /^([A-Za-z0-9_-]+):\s*(.*)$/
      );

    if (!match) continue;

    fields[match[1]] =
      stripQuotes(
        match[2].trim()
      );
  }

  return fields;
}


function collectAssetReferences(
  pages
) {

  const references =
    [];

  const patterns =
    [
      {
        source:
          'data-asset',
        pattern:
          /data-asset="([^"]+)"/g
      },
      {
        source:
          'data-image-asset',
        pattern:
          /data-image-asset="([^"]+)"/g
      },
      {
        source:
          'data-map-asset',
        pattern:
          /data-map-asset="([^"]+)"/g
      },
      {
        source:
          'map.assetPath',
        pattern:
          /"assetPath"\s*:\s*"([^"]+)"/g
      },
      {
        source:
          'music.src',
        pattern:
          /"(?:src|path|asset)"\s*:\s*"([^"]+\.(?:mp3|wav|ogg|m4a|aac|flac|webm))"/gi
      }
    ];

  for (const page of pages) {

    for (const { source, pattern } of patterns) {

      pattern.lastIndex =
        0;

      let match;

      while (
        (match = pattern.exec(page.content))
      ) {

        references.push({
          pageId:
            page.id,
          title:
            page.title,
          source,
          path:
            normalizeAssetPath(
              match[1]
            )
        });
      }
    }
  }

  return references.filter(reference =>
    reference.path
  );
}


function inspectMapPage(
  page
) {

  const model =
    parseMapModel(
      page.content
    );

  const tokens =
    Array.isArray(model?.tokens)
      ? model.tokens.length
      : countMatches(
        page.content,
        'campaign-map-token'
      );

  const shapes =
    Array.isArray(model?.shapes)
      ? model.shapes.length
      : countMatches(
        page.content,
        'campaign-map-shape'
      );

  const drawings =
    Array.isArray(model?.drawings)
      ? model.drawings.length
      : countMatches(
        page.content,
        'campaign-map-drawing'
      );

  const fogZones =
    Array.isArray(model?.fog?.zones)
      ? model.fog.zones.length
      : countMatches(
        page.content,
        'fog'
      );

  const background =
    model?.background?.assetPath ||
    model?.background?.asset ||
    '';

  const score =
    page.sizeBytes +
    tokens * 3000 +
    shapes * 1200 +
    drawings * 1500 +
    fogZones * 2500;

  return {
    id:
      page.id,
    title:
      page.title,
    sizeBytes:
      page.sizeBytes,
    tokens,
    shapes,
    drawings,
    fogZones,
    background:
      normalizeAssetPath(
        background
      ),
    score
  };
}


function parseMapModel(
  content
) {

  const match =
    content.match(
      /<script type="application\/json" data-campaign-map-model>([\s\S]*?)<\/script>/
    );

  if (!match) return null;

  try {

    return JSON.parse(
      match[1]
    );

  } catch {

    return null;
  }
}


function buildWarnings({
  pages,
  assetFiles,
  backupHealth,
  missingAssetReferences,
  heavyMaps
}) {

  const warnings =
    [];

  const hugePages =
    pages.filter(page =>
      page.sizeBytes > 250 * 1024
    );

  if (hugePages.length) {

    warnings.push({
      code:
        'large_pages',
      message:
        'Some pages are larger than 250 KB.',
      count:
        hugePages.length,
      examples:
        hugePages.slice(
          0,
          5
        ).map(page => ({
          title:
            page.title,
          sizeBytes:
            page.sizeBytes
        }))
    });
  }

  const hugeAssets =
    assetFiles.filter(file =>
      file.sizeBytes > 12 * 1024 * 1024
    );

  if (hugeAssets.length) {

    warnings.push({
      code:
        'large_assets',
      message:
        'Some assets are larger than 12 MB.',
      count:
        hugeAssets.length,
      examples:
        hugeAssets.slice(
          0,
          5
        )
    });
  }

  if (missingAssetReferences.length) {

    warnings.push({
      code:
        'missing_asset_refs',
      message:
        'Some pages reference assets that do not exist in the workspace assets folder.',
      count:
        missingAssetReferences.length,
      examples:
        missingAssetReferences.slice(
          0,
          5
        )
    });
  }

  if (backupHealth.incompleteCount) {

    warnings.push({
      code:
        'incomplete_backups',
      message:
        'There are incomplete backup folders without manifest.json.',
      count:
        backupHealth.incompleteCount,
      examples:
        backupHealth.incomplete.slice(
          0,
          5
        )
    });
  }

  const heavyMap =
    heavyMaps.find(map =>
      map.score > 500000 ||
      map.tokens + map.shapes + map.drawings + map.fogZones > 250
    );

  if (heavyMap) {

    warnings.push({
      code:
        'heavy_maps',
      message:
        'At least one map has many render objects or a large page payload.',
      examples:
        heavyMaps.slice(
          0,
          5
        )
    });
  }

  return warnings;
}


function printHumanReport(
  diagnostics
) {

  console.log(
    `Workspace: ${diagnostics.workspace}`
  );

  console.log(
    `Location: ${diagnostics.access.location.summary}`
  );

  console.log(
    `Write access: ${diagnostics.access.canWrite ? 'OK' : 'not available or not checked'}`
  );

  console.log(
    `Pages: ${diagnostics.summary.pageCount}, maps: ${diagnostics.summary.campaignMapCount}, assets: ${diagnostics.summary.assetFileCount}`
  );

  console.log(
    `Asset refs: ${diagnostics.summary.assetReferenceCount}, missing refs: ${diagnostics.summary.missingAssetReferenceCount}`
  );

  console.log(
    `Backups: ${diagnostics.summary.completeBackupCount} complete, ${diagnostics.summary.incompleteBackupCount} incomplete`
  );

  if (diagnostics.warnings.length) {

    console.log(
      '\nWarnings:'
    );

    diagnostics.warnings.forEach(warning => {
      console.log(
        `- ${warning.code}: ${warning.message}`
      );
    });
  }

  if (diagnostics.errors.length) {

    console.log(
      '\nErrors:'
    );

    diagnostics.errors.forEach(error => {

      const location =
        error.path
          ? ` (${error.path})`
          : '';

      console.log(
        `- ${error.code}: ${formatHumanErrorMessage(error)}${location}`
      );
    });
  }
}


function formatHumanErrorMessage(
  error
) {

  if (error.code === 'pages_read_failed') {

    return 'Pages folder could not be read. Check that this is a MyOwnWorld workspace and that the path is correct.';
  }

  return error.message;
}


function countBy(
  items,
  getKey
) {

  const counts =
    {};

  for (const item of items) {

    const key =
      getKey(
        item
      );

    counts[key] =
      (counts[key] || 0) + 1;
  }

  return counts;
}


function countMatches(
  value,
  pattern
) {

  return String(value || '').split(pattern).length - 1;
}


function parseArgs(
  argv
) {

  const parsed =
    {
      _:
        []
    };

  for (let index = 0; index < argv.length; index += 1) {

    const arg =
      argv[index];

    if (!arg.startsWith('--')) {

      parsed._.push(
        arg
      );

      continue;
    }

    const key =
      arg.slice(2);

    const next =
      argv[index + 1];

    if (
      next &&
      !next.startsWith('--')
    ) {

      parsed[key] =
        next;

      index += 1;

    } else {

      parsed[key] =
        true;
    }
  }

  return parsed;
}


function parseBooleanFlag(
  value,
  fallback
) {

  if (value === undefined) return fallback;
  if (value === true) return true;
  if (value === false) return false;

  const normalized =
    String(value).toLowerCase();

  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'no'
  ) {

    return false;
  }

  if (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes'
  ) {

    return true;
  }

  return fallback;
}


function parseListValue(
  value
) {

  if (!value) return [];

  const text =
    String(value).trim();

  if (
    text.startsWith('[') &&
    text.endsWith(']')
  ) {

    return text
      .slice(
        1,
        -1
      )
      .split(',')
      .map(stripQuotes)
      .map(item =>
        item.trim()
      )
      .filter(Boolean);
  }

  return text
    .split(',')
    .map(item =>
      item.trim()
    )
    .filter(Boolean);
}


function normalizeParent(
  value
) {

  if (
    !value ||
    value === 'null' ||
    value === '~'
  ) {

    return null;
  }

  return value;
}


function normalizeAssetPath(
  value
) {

  return normalizeRelativePath(
    String(value || '')
      .replace(/^asset:\/\//, '')
      .replace(/^http:\/\/asset\.localhost\//, '')
      .replace(/^assets\//, '')
  );
}


function normalizeRelativePath(
  value
) {

  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}


function stripQuotes(
  value
) {

  return String(value || '')
    .replace(/^['"]|['"]$/g, '');
}


function sum(
  items,
  getValue
) {

  return items.reduce(
    (total, item) =>
      total + Number(getValue(item) || 0),
    0
  );
}
