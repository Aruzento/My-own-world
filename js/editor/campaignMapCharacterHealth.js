import {
  applyCharacterHealthChange,
  getCharacterHealth
} from '../character/characterModel.js';
import {
  commitStructuredCharacterHealthChange,
  prepareStructuredCharacterHealthChange
} from '../character/structuredCharacterHealth.js';
import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../storage/pageCommandService.js';
import { captureStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { state } from '../state.js';
import { updatePageDndHealth } from './campaignMapHealth.js';
import {
  getCampaignMapCharacterState,
  isCampaignMapStructuredPage,
  prepareCampaignMapCharacterContext
} from './campaignMapCharacterBridge.js';


export const CAMPAIGN_MAP_HEALTH_ERROR_CODES = Object.freeze({
  SOURCE_UNAVAILABLE: 'CAMPAIGN_MAP_CHARACTER_SOURCE_UNAVAILABLE',
  HEALTH_UNAVAILABLE: 'CAMPAIGN_MAP_CHARACTER_HEALTH_UNAVAILABLE',
  WRITE_BLOCKED: 'CAMPAIGN_MAP_CHARACTER_HEALTH_WRITE_BLOCKED',
  WRITE_UNCERTAIN: 'CAMPAIGN_MAP_CHARACTER_HEALTH_WRITE_UNCERTAIN'
});


const plans = new WeakMap();


export async function prepareCampaignMapCharacterHealthChange({
  map,
  page,
  intent = {},
  pages = state.pages,
  storageAdapter = null,
  workspaceContext = null
} = {}) {
  if (!page?.id) {
    throw mapHealthError(
      CAMPAIGN_MAP_HEALTH_ERROR_CODES.SOURCE_UNAVAILABLE,
      'missing-linked-page'
    );
  }

  if (!isCampaignMapStructuredPage(page)) {
    const previousPage = snapshotPageForCommand(page);
    const draftPage = clonePage(page);
    const after = updatePageDndHealth(draftPage, intent);

    if (!after) {
      throw mapHealthError(
        CAMPAIGN_MAP_HEALTH_ERROR_CODES.HEALTH_UNAVAILABLE,
        'legacy-health-unavailable'
      );
    }

    const plan = Object.freeze({
      kind: 'CampaignMapCharacterHealthPlan', version: 1,
      pageId: page.id, source: 'legacy',
      intent: Object.freeze({ ...intent }), before: null,
      after: Object.freeze({ ...after }),
      changed: draftPage.content !== page.content
    });
    plans.set(plan, {
      page, previousPage, nextContent: draftPage.content,
      workspaceContext: workspaceContext || captureStorageWorkspaceContext()
    });
    return plan;
  }

  const context = await prepareCampaignMapCharacterContext(map, {
    pages, includePages: [page], storageAdapter, workspaceContext
  });
  const characterState = getCampaignMapCharacterState(page, { context, pages });

  if (!characterState || context.mode !== 'source-aware') {
    throw mapHealthError(
      CAMPAIGN_MAP_HEALTH_ERROR_CODES.SOURCE_UNAVAILABLE,
      context.reason || 'structured-source-unavailable'
    );
  }

  const request = createStructuredRequest(characterState.model, intent);
  const previousPage = snapshotPageForCommand(page);
  let underlying;

  try {
    underlying = prepareStructuredCharacterHealthChange({
      pageId: page.id,
      expectedBase: previousPage.pageStateIdentity,
      request,
      context: {
        registry: context.registry,
        repository: context.repository,
        pages,
        workspaceContext: context.workspaceContext
      }
    });
  } catch (error) {
    throw mapHealthError(
      CAMPAIGN_MAP_HEALTH_ERROR_CODES.HEALTH_UNAVAILABLE,
      error.reason || error.code || 'structured-health-unavailable',
      error
    );
  }

  const plan = Object.freeze({
    kind: 'CampaignMapCharacterHealthPlan', version: 1,
    pageId: page.id, source: 'structured',
    intent: Object.freeze({ ...intent }), request: Object.freeze({ ...request }),
    before: Object.freeze({ ...underlying.before }),
    after: Object.freeze({ ...underlying.after }),
    changed: underlying.changed
  });
  plans.set(plan, { page, pages, context, underlying });
  return plan;
}


export async function commitCampaignMapCharacterHealthChange(plan) {
  const captured = plans.get(plan);
  if (!captured) return mapCommitResult('blocked', false, 'unknown-or-used-plan');
  plans.delete(plan);

  if (!plan.changed) {
    return mapCommitResult('unchanged', false, 'health-unchanged', plan.after, plan.source);
  }

  if (plan.source === 'structured') {
    const result = await commitStructuredCharacterHealthChange(captured.underlying);
    return Object.freeze({
      kind: 'CampaignMapCharacterHealthCommitResult', version: 1,
      status: result.status, written: result.written,
      reason: result.reason || '', source: 'structured',
      after: result.after || plan.after,
      characterState: result.status === 'saved'
        ? getCampaignMapCharacterState(captured.page, {
          context: captured.context, pages: captured.pages
        })
        : null,
      structuredResult: result
    });
  }

  try {
    const receipt = await persistPageContentCommand({
      page: captured.page,
      content: captured.nextContent,
      previousPage: captured.previousPage,
      expectedBase: captured.previousPage.pageStateIdentity,
      workspaceContext: captured.workspaceContext,
      type: 'update-page-content',
      reason: 'campaign-map-token-health'
    });

    if (
      receipt.writeStatus !== 'saved' || !receipt.written ||
      receipt.blocked || receipt.stale || receipt.conflict
    ) {
      return mapCommitResult(
        receipt.written ? 'uncertain' : 'blocked',
        receipt.written,
        'legacy-page-write-unconfirmed',
        plan.after,
        'legacy'
      );
    }
    return mapCommitResult('saved', true, '', plan.after, 'legacy');
  } catch (error) {
    throw error;
  }
}


function createStructuredRequest(model, intent) {
  const mode = intent?.mode || 'delta';
  const hasExplicitTemp = intent?.temp !== null && intent?.temp !== undefined;

  if (mode === 'delta' && !hasExplicitTemp) {
    return { type: 'delta', delta: Number(intent?.delta || 0) };
  }

  const after = getCharacterHealth(
    applyCharacterHealthChange(model, {
      delta: Number(intent?.delta || 0),
      temp: hasExplicitTemp ? intent.temp : null,
      mode
    })
  );
  return { type: 'exact', hpCurrent: after.current, hpTemp: after.temp };
}


function mapCommitResult(status, written, reason, after = null, source = '') {
  return Object.freeze({
    kind: 'CampaignMapCharacterHealthCommitResult', version: 1,
    status, written, reason, source, after
  });
}


function mapHealthError(code, reason, cause = null) {
  const error = new Error(reason, cause ? { cause } : undefined);
  error.code = code;
  error.reason = reason;
  return error;
}


function clonePage(page) {
  return {
    ...page,
    tags: Array.isArray(page.tags) ? [...page.tags] : [],
    aliases: Array.isArray(page.aliases) ? [...page.aliases] : [],
    relationships: Array.isArray(page.relationships)
      ? page.relationships.map(value => ({ ...value }))
      : []
  };
}
