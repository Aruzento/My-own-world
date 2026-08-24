import {
  arePageStateIdentitiesEqual,
  createPageStateIdentityFromContent,
  createPageStateIdentityFromPage,
  normalizePageStateIdentity
} from '../core/pageRecord.js';

import {
  getStorageAdapter
} from './storageAdapter.js';


export async function readCurrentDurablePageStateIdentity(
  page,
  options = {}
) {

  const content =
    await readCurrentDurablePageContent(
      page,
      options
    );

  return createPageStateIdentityFromContent(
    content || '',
    {
      pageId:
        page?.id || null,
      source:
        page?.path
          ? 'storage'
          : 'runtime'
    }
  );
}


export async function readCurrentDurablePageContent(
  page,
  options = {}
) {

  const storageAdapter =
    options.storageAdapter || getStorageAdapter();

  return page?.path && typeof storageAdapter?.readText === 'function'
    ? storageAdapter.readText(
      page.path
    )
    : page?.content;
}


export async function evaluatePageWritePrecondition({
  page,
  expectedBase = null,
  storageAdapter = null
} = {}) {

  const expected =
    normalizePageStateIdentity(
      expectedBase
    );

  if (!expected) {

    return {
      status:
        'not-provided',
      ok:
        true,
      expectedBase:
        null,
      currentBase:
        null
    };
  }

  try {

    const currentBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            storageAdapter || getStorageAdapter()
        }
      );

    const ok =
      arePageStateIdentitiesEqual(
        expected,
        currentBase
      );

    return {
      status:
        ok
          ? 'matched'
          : 'mismatch',
      ok,
      expectedBase:
        expected,
      currentBase:
        normalizePageStateIdentity(
          currentBase
        )
    };

  } catch (error) {

    return {
      status:
        'read-failed',
      ok:
        false,
      failureKind:
        classifyPreconditionReadFailure(
          error
        ),
      expectedBase:
        expected,
      currentBase:
        null,
      error:
        String(
          error?.message || error || 'Unable to read current page state.'
        )
    };
  }
}


export function shouldBlockPageWriteForPrecondition(
  precondition
) {

  if (!precondition) return false;

  if (precondition.status === 'not-provided') return false;

  return precondition.ok !== true;
}


export function createPageWritePreconditionBlockedResult({
  writeKey,
  writeRevision,
  pageId = null,
  operationKind = null,
  reason = null,
  precondition = null
} = {}) {

  const conflict =
    precondition?.status === 'mismatch';

  const blockReason =
    getPageWritePreconditionBlockReason(
      precondition
    );

  return {
    key:
      writeKey || null,
    revision:
      writeRevision?.revision ?? null,
    state:
      getPageWritePreconditionRevisionState(
        precondition
      ),
    written:
      false,
    skipped:
      true,
    current:
      true,
    blocked:
      true,
    preconditionBlocked:
      true,
    conflict,
    blockReason,
    operationKind:
      operationKind || null,
    reason:
      reason || null,
    precondition,
    conflictEvidence:
      createPageWritePreconditionEvidence({
        pageId,
        operationKind,
        reason,
        precondition,
        blockReason,
        conflict
      })
  };
}


export function getPageWritePreconditionRevisionState(
  precondition
) {

  return precondition?.status === 'mismatch'
    ? 'conflict'
    : 'precondition-blocked';
}


export function getPageWritePreconditionMessage(
  precondition
) {

  if (precondition?.status === 'mismatch') {

    return 'Page write precondition conflict.';
  }

  return precondition?.error ||
    'Page write precondition could not be verified.';
}


export function createPageWriteExpectedBase(
  page
) {

  return normalizePageStateIdentity(
    createPageStateIdentityFromPage(
      page
    )
  );
}


function getPageWritePreconditionBlockReason(
  precondition
) {

  return precondition?.status === 'mismatch'
    ? 'page-state-conflict'
    : (
      precondition?.failureKind ||
      'page-state-precondition-unavailable'
    );
}


function createPageWritePreconditionEvidence({
  pageId,
  operationKind,
  reason,
  precondition,
  blockReason,
  conflict
}) {

  return {
    kind:
      conflict
        ? 'page-write-conflict'
        : 'page-write-precondition-block',
    pageId:
      pageId ||
      precondition?.currentBase?.pageId ||
      precondition?.expectedBase?.pageId ||
      null,
    operationKind:
      operationKind || null,
    reason:
      reason || null,
    blockReason:
      blockReason || null,
    expectedBase:
      precondition?.expectedBase || null,
    currentBase:
      precondition?.currentBase || null,
    preconditionStatus:
      precondition?.status || null
  };
}


function classifyPreconditionReadFailure(
  error
) {

  const message =
    String(
      error?.message || error || ''
    ).toLowerCase();

  if (
    /\bmissing\b|\bnot found\b|\benoent\b|\bnotfound\b|не найден|не существует/.test(
      message
    )
  ) {

    return 'current-page-missing';
  }

  if (
    /\bpermission\b|\bdenied\b|\beacces\b|\baccess\b|доступ/.test(
      message
    )
  ) {

    return 'current-page-unreadable';
  }

  return 'current-page-unavailable';
}
