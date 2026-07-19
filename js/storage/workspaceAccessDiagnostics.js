import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

const DEFAULT_PROBE_PATH =
  '.my-own-world-write-probe.tmp';


export function classifyWorkspaceLocation(
  workspacePath,
  options = {}
) {

  const rawPath =
    String(workspacePath || '').trim();

  const normalized =
    normalizeSystemPath(
      rawPath
    );

  const homePath =
    normalizeSystemPath(
      options.homePath ||
      getEnvironmentHomePath()
    );

  const platform =
    options.platform ||
    inferPlatform(
      normalized,
      homePath
    );

  const drive =
    getWindowsDrive(
      normalized
    );

  const homeDrive =
    getWindowsDrive(
      homePath
    );

  const isNetwork =
    isNetworkPath(
      normalized
    );

  const isDifferentDrive =
    Boolean(
      drive &&
      homeDrive &&
      drive.toLowerCase() !== homeDrive.toLowerCase()
    );

  const isOutsideHome =
    Boolean(
      normalized &&
      homePath &&
      !isPathInside(
        normalized,
        homePath,
        platform
      )
    );

  const isPossibleExternalDrive =
    Boolean(
      isDifferentDrive &&
      !isNetwork
    );

  const tags =
    [];

  if (!normalized) {

    tags.push(
      'workspace not selected'
    );

  } else {

    if (isNetwork) tags.push('network folder');
    if (isDifferentDrive) tags.push('different drive');
    if (isPossibleExternalDrive) tags.push('possible external drive');
    if (isOutsideHome) tags.push('outside HOME');

    if (!tags.length) {

      tags.push(
        'inside HOME/default disk'
      );
    }
  }

  return {
    path:
      rawPath,
    normalizedPath:
      normalized,
    homePath,
    platform,
    drive,
    homeDrive,
    isNetwork,
    isDifferentDrive,
    isPossibleExternalDrive,
    isOutsideHome,
    tags,
    summary:
      tags.join(', ')
  };
}


export async function collectWorkspaceAccessDiagnostics(
  options = {}
) {

  const adapter =
    options.storageAdapter;

  const workspacePath =
    options.workspacePath ||
    adapter?.getWorkspaceRoot?.() ||
    adapter?.getWorkspaceHandle?.()?.name ||
    '';

  const hasAccess =
    options.hasWorkspace !== undefined
      ? Boolean(options.hasWorkspace)
      : Boolean(workspacePath);

  const location =
    classifyWorkspaceLocation(
      workspacePath,
      options
    );

  const permissionCanWrite =
    options.canWriteWorkspace !== undefined
      ? Boolean(options.canWriteWorkspace)
      : null;

  const shouldProbeWrite =
    Boolean(
      options.writeProbe &&
      adapter &&
      hasAccess
    );

  const writeProbe =
    shouldProbeWrite
      ? await runWorkspaceWriteProbe(
        adapter,
        options
      )
      : {
        attempted:
          false,
        ok:
          permissionCanWrite,
        code:
          '',
        message:
          permissionCanWrite === false
            ? 'Write access is not available.'
            : 'Write probe was not run.'
      };

  const canWrite =
    writeProbe.attempted
      ? writeProbe.ok === true
      : permissionCanWrite === null
        ? null
        : permissionCanWrite;

  const matrix =
    buildWorkspaceAccessMatrix({
      location,
      hasAccess,
      canWrite,
      writeProbe
    });

  return {
    mode:
      adapter?.kind || options.mode || 'unknown',
    path:
      workspacePath || 'Workspace not selected',
    hasAccess,
    canWrite:
      canWrite === true,
    canWriteKnown:
      canWrite !== null,
    location,
    writeProbe,
    matrix,
    matrixSummary:
      summarizeMatrix(
        matrix
      )
  };
}


export async function runWorkspaceWriteProbe(
  adapter,
  options = {}
) {

  const probePath =
    normalizeWorkspacePath(
      options.probePath ||
      DEFAULT_PROBE_PATH
    );

  const content =
    `my-own-world-write-probe:${Date.now()}`;

  let wrote =
    false;

  try {

    await adapter.writeText(
      probePath,
      content
    );

    wrote =
      true;

    const readBack =
      await adapter.readText(
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
        cleanupOk:
          await cleanupProbeFile(
            adapter,
            probePath
          )
      };
    }

    const cleanupOk =
      await cleanupProbeFile(
        adapter,
        probePath
      );

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

  } catch (error) {

    const normalized =
      normalizeWorkspaceAccessError(
        error
      );

    if (wrote) {

      await cleanupProbeFile(
        adapter,
        probePath
      );
    }

    return {
      attempted:
        true,
      ok:
        false,
      code:
        normalized.code,
      path:
        normalized.path || probePath,
      message:
        normalized.userMessage,
      rawMessage:
        normalized.message,
      cleanupOk:
        !wrote
    };
  }
}


export function buildWorkspaceAccessMatrix({
  location,
  hasAccess,
  canWrite,
  writeProbe
}) {

  return [
    createMatrixRow({
      id:
        'different-drive',
      label:
        'Workspace on another disk',
      status:
        location.isDifferentDrive
          ? 'matched'
          : 'not-detected',
      message:
        location.isDifferentDrive
          ? `Workspace drive ${location.drive}, HOME drive ${location.homeDrive}.`
          : 'Current path is not detected as another disk.'
    }),
    createMatrixRow({
      id:
        'network-folder',
      label:
        'Workspace in network folder',
      status:
        location.isNetwork
          ? 'matched'
          : 'not-detected',
      message:
        location.isNetwork
          ? 'UNC/network path detected.'
          : 'Current path is not detected as a network folder.'
    }),
    createMatrixRow({
      id:
        'external-drive',
      label:
        'Workspace on external drive',
      status:
        location.isPossibleExternalDrive
          ? 'possible'
          : 'needs-real-hardware',
      message:
        location.isPossibleExternalDrive
          ? 'Different local drive detected; this covers the external-drive risk class.'
          : 'Needs a real removable/external drive smoke pass.'
    }),
    createMatrixRow({
      id:
        'outside-home',
      label:
        'Workspace outside HOME',
      status:
        location.isOutsideHome
          ? 'matched'
          : 'not-detected',
      message:
        location.isOutsideHome
          ? 'Path is outside the user HOME folder.'
          : 'Current path is inside HOME or HOME is unknown.'
    }),
    createMatrixRow({
      id:
        'read-only',
      label:
        'Read-only / no write access',
      status:
        !hasAccess
          ? 'blocked'
          : canWrite === false
            ? 'blocked'
            : canWrite === true
              ? 'ok'
              : 'unknown',
      message:
        getWriteAccessMessage(
          writeProbe,
          canWrite
        )
    })
  ];
}


export function normalizeWorkspaceAccessError(
  error
) {

  const code =
    String(
      error?.code ||
      error?.name ||
      'workspace.unknown_error'
    );

  const message =
    String(
      error?.message ||
      error ||
      code
    );

  const lower =
    `${code} ${message}`.toLowerCase();

  let userMessage =
    'Workspace operation failed.';

  if (
    lower.includes('permission') ||
    lower.includes('access denied') ||
    lower.includes('eacces') ||
    lower.includes('eperm') ||
    lower.includes('notallowed')
  ) {

    userMessage =
      'No write permission for this workspace.';

  } else if (
    lower.includes('not found') ||
    lower.includes('enoent') ||
    lower.includes('file_not_found')
  ) {

    userMessage =
      'File or folder was not found. The disk may be disconnected or the path changed.';

  } else if (
    lower.includes('locked') ||
    lower.includes('busy') ||
    lower.includes('ebusy')
  ) {

    userMessage =
      'File is locked by another app or the disk is busy.';

  } else if (
    lower.includes('outside_workspace')
  ) {

    userMessage =
      'Path points outside the selected workspace and was blocked.';
  }

  return {
    code,
    message,
    userMessage,
    path:
      error?.path || null,
    raw:
      error
  };
}


function createMatrixRow({
  id,
  label,
  status,
  message
}) {

  return {
    id,
    label,
    status,
    message
  };
}


function getWriteAccessMessage(
  writeProbe,
  canWrite
) {

  if (writeProbe?.attempted) {

    return writeProbe.message;
  }

  if (canWrite === true) {

    return 'Permission check says write access is available.';
  }

  if (canWrite === false) {

    return 'Permission check says write access is not available.';
  }

  return 'Write access was not checked yet.';
}


async function cleanupProbeFile(
  adapter,
  probePath
) {

  try {

    await adapter.removeFile(
      probePath
    );

    return true;

  } catch {

    return false;
  }
}


function summarizeMatrix(
  matrix
) {

  const active =
    matrix.filter(row =>
      [
        'matched',
        'possible',
        'blocked'
      ].includes(
        row.status
      )
    );

  if (!active.length) {

    return 'standard local workspace';
  }

  return active
    .map(row =>
      `${row.label}: ${row.status}`
    )
    .join('; ');
}


function normalizeSystemPath(
  value
) {

  const text =
    String(value || '')
      .trim()
      .replace(/\\/g, '/');

  if (!text) return '';

  if (/^[A-Za-z]:\/?$/.test(text)) {

    return text.endsWith('/')
      ? text
      : `${text}/`;
  }

  return text.replace(/\/+$/g, '');
}


function inferPlatform(
  workspacePath,
  homePath
) {

  if (
    /^[A-Za-z]:\//.test(workspacePath) ||
    /^[A-Za-z]:\//.test(homePath) ||
    isNetworkPath(workspacePath)
  ) {

    return 'win32';
  }

  return 'posix';
}


function getWindowsDrive(
  value
) {

  const match =
    String(value || '').match(
      /^([A-Za-z]:)\//
    );

  return match?.[1] || '';
}


function isNetworkPath(
  value
) {

  return /^\/\/[^/]+\/[^/]+/.test(
    String(value || '')
  );
}


function isPathInside(
  child,
  parent,
  platform
) {

  const normalizedChild =
    normalizeForCompare(
      child,
      platform
    );

  const normalizedParent =
    normalizeForCompare(
      parent,
      platform
    );

  return normalizedChild === normalizedParent ||
    normalizedChild.startsWith(
      `${normalizedParent}/`
    );
}


function normalizeForCompare(
  value,
  platform
) {

  const normalized =
    normalizeSystemPath(
      value
    );

  return platform === 'win32'
    ? normalized.toLowerCase()
    : normalized;
}


function getEnvironmentHomePath() {

  return globalThis.process?.env?.USERPROFILE ||
    globalThis.process?.env?.HOME ||
    '';
}
