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

  const storageAdapter =
    options.storageAdapter || getStorageAdapter();

  const content =
    page?.path && typeof storageAdapter?.readText === 'function'
      ? await storageAdapter.readText(
        page.path
      )
      : page?.content;

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


export function createPageWriteExpectedBase(
  page
) {

  return normalizePageStateIdentity(
    createPageStateIdentityFromPage(
      page
    )
  );
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
