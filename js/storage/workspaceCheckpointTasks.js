import {
  state
} from '../state.js';

import {
  enqueueBackgroundCheckpoint
} from '../performance/backgroundCheckpointQueue.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';

import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  listPendingWorkspaceOperations
} from './operationJournal.js';

import {
  validateWorkspaceSnapshot
} from '../schema/workspaceSchema.js';

import {
  rebuildPageRepository,
  validateTreeIndex
} from '../repository/pageRepository.js';


export function scheduleWorkspaceCheckpoint({
  reason = 'workspace-mutation',
  workspaceId = getCurrentWorkspaceId()
} = {}) {

  return enqueueBackgroundCheckpoint({
    type: 'workspace.validation-checkpoint',
    workspaceId,
    reason,
    run:
      runWorkspaceValidationCheckpoint
  });
}


export async function runWorkspaceValidationCheckpoint({
  reasons = []
} = {}) {

  const pages =
    Array.isArray(state.pages)
      ? state.pages
      : [];

  rebuildPageRepository(
    pages
  );

  const validation =
    validateWorkspaceSnapshot({
      pages,
      assetReferences:
        collectAssetReferencesFromPages(
          pages
        )
    });

  const treeValidation =
    validateTreeIndex();

  const pendingOperations =
    await listPendingOperationsSafely();

  const result = {
    ok:
      validation.ok &&
      treeValidation.valid &&
      pendingOperations.length === 0,
    reasons:
      [...reasons],
    pageCount:
      pages.length,
    schemaIssues:
      validation.issues.length,
    schemaErrors:
      validation.errors.length,
    treeErrors:
      treeValidation.errors.length,
    treeWarnings:
      treeValidation.warnings.length,
    pendingOperations:
      pendingOperations.length,
    checkedAt:
      new Date().toISOString()
  };

  state.workspaceValidation =
    validation;

  state.workspaceCheckpoint =
    result;

  if (!result.ok) {

    console.warn(
      'Workspace checkpoint found issues.',
      result
    );
  }

  return result;
}


function getCurrentWorkspaceId() {

  const adapter =
    getStorageAdapter();

  return String(
    adapter.getWorkspaceRoot?.() ||
    adapter.getWorkspaceHandle?.()?.name ||
    adapter.kind ||
    'current-workspace'
  );
}


async function listPendingOperationsSafely() {

  try {

    return await listPendingWorkspaceOperations();

  } catch (error) {

    return [];
  }
}
