import { iconSvg } from '../core/icons.js';
import { isCombatStateSaveConfirmed, logCombatSessionOperation } from '../events/combatSessionEventLog.js';
import { positionPopupNearAnchor } from '../ui/popupPosition.js';

import {
  executeCombatAttack
} from '../combat/combatActionPipeline.js';

import {
  createCombatAttackPresentation,
  createManualCombatAttackRequest
} from './campaignMapCombatAttackUi.js';

import {
  CampaignMapInitiativeModel,
  createParticipantFromToken,
  isTokenAlive,
  rollD20
} from './campaignMapInitiativeModel.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  closeMapPopup,
  getMapPopup,
  showMapPopup
} from './campaignMapPopupController.js';

import {
  escapeAttribute,
  escapeHTML,
  getMapPopupFrameHTML,
  getMapPopupSectionHTML
} from './campaignMapPopupMarkup.js';


const INITIATIVE_TEXT = {
  title:
    '\u0418\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0430',
  turnTitle:
    '\u0425\u043e\u0434\u044b',
  noCreatures:
    '\u041d\u0430 \u043a\u0430\u0440\u0442\u0435 \u043d\u0435\u0442 \u0436\u0438\u0432\u044b\u0445 \u0441\u0443\u0449\u0435\u0441\u0442\u0432',
  noParticipants:
    '\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u044b',
  activePrefix:
    '\u0425\u043e\u0434',
  noActive:
    '\u041d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u0445\u043e\u0434\u0430',
  apply:
    '\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c',
  saveOrder:
    '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u0440\u044f\u0434\u043e\u043a',
  rollAll:
    'Roll d20',
  edit:
    '\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438',
  close:
    '\u0417\u0430\u043a\u0440\u044b\u0442\u044c',
  previous:
    '\u041d\u0430\u0437\u0430\u0434',
  next:
    '\u0414\u0430\u043b\u044c\u0448\u0435',
  player:
    '\u0438\u0433\u0440\u043e\u043a',
  duplicate:
    '\u0434\u0443\u0431\u043b\u044c',
  initiative:
    '\u0418\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0430',
  setActive:
    '\u0421\u0434\u0435\u043b\u0430\u0442\u044c \u0445\u043e\u0434\u043e\u043c'
};


export function openInitiativePopup(
  map,
  anchor,
  deps = {}
) {

  const store =
    getCampaignMapStore(
      map
    );

  const model =
    store?.getModel();

  if (!store || !model) return;

  const popup =
    getMapPopup();

  const initiative =
    new CampaignMapInitiativeModel(
      model.initiative
    );

  popup.removeAttribute('aria-busy');

  if (initiative.participants.length || getSession(model)) {

    renderOrderPopup(
      popup,
      store,
      deps,
      anchor
    );

  } else {

    renderPickerPopup(
      popup,
      model
    );

    bindPickerActions(
      popup,
      store,
      deps,
      anchor
    );
  }

  showMapPopup(
    popup,
    anchor,
    'initiative'
  );
}


function renderPickerPopup(
  popup,
  model
) {

  popup.innerHTML =
    getPickerHTML();

  renderPickerList(
    popup,
    model
  );
}


function bindPickerActions(popup, store, deps, anchor) {
  popup.querySelector('.campaign-initiative-save-btn').addEventListener('click', event => {
    event.preventDefault();
    void runPopupAction(popup, store, deps, anchor, () => applySelectedParticipants(popup, store), { auditOperation: 'roster' });
  });
  popup.querySelector('.campaign-initiative-roll-btn').addEventListener('click', event => {
    event.preventDefault();
    if (!isFrozen(store.getModel())) fillRolls(popup);
  });
  popup.querySelector('.campaign-initiative-close-btn').addEventListener('click', closeMapPopup);
}


function renderPickerList(popup, model) {
  const list = popup.querySelector('.campaign-initiative-list');
  const initiative = new CampaignMapInitiativeModel(model.initiative);
  const existingTokenIds = new Set(initiative.participants.map(member => member.tokenId));
  // Retain existing dead/missing-token/manual entries until explicitly unchecked.
  const rows = initiative.participants.map(member =>
    getPickerRowHTML(model.getToken(member.tokenId) || { tokenId: member.tokenId }, member, { selected: true })
  );
  for (const token of model.tokens) {
    if (token.type !== 'creature' || !isTokenAlive(token) || existingTokenIds.has(token.tokenId)) continue;
    rows.push(getPickerRowHTML(token, null, { selected: initiative.participants.length === 0 }));
  }
  list.innerHTML = rows.join('') || `<div class="campaign-initiative-empty">${INITIATIVE_TEXT.noCreatures}</div>`;
}


function fillRolls(
  popup
) {

  popup
    .querySelectorAll('.campaign-initiative-row')
    .forEach(row => {

      const checkbox =
        row.querySelector('.campaign-initiative-checkbox');

      const input =
        row.querySelector('.campaign-initiative-value');

      const modifier =
        Number(
          input?.dataset.modifier || 0
        );

      if (!checkbox?.checked || !input) return;

      input.value =
        String(
          rollD20() + modifier
        );
    });
}


function applySelectedParticipants(popup, store) {
  const model = store.getModel();
  if (isFrozen(model)) return { ok: false, reason: 'roster-edit-not-allowed' };
  if (hasUnresolvedMembership(model)) return { ok: false, reason: 'roster-mismatch' };
  const previous = new CampaignMapInitiativeModel(model.initiative);
  const participants = [...popup.querySelectorAll('.campaign-initiative-row')]
    .map(row => createParticipantFromRow(row, model, previous)).filter(Boolean);
  const initiative = new CampaignMapInitiativeModel({
    participants,
    activeParticipantId: getNextActiveParticipantId(previous.activeParticipantId, participants)
  });
  initiative.sortByInitiative();
  return publishInitiative(store, initiative, { membership: true });
}


function createParticipantFromRow(row, model, previous) {
  const checkbox = row.querySelector('.campaign-initiative-checkbox');
  if (!checkbox?.checked) return null;
  const existing = previous.getParticipant(row.dataset.participantId);
  const token = model.getToken(checkbox.value);
  if (!existing && !token) return null;
  const next = existing || createParticipantFromToken(token);
  const total = normalizeNumber(row.querySelector('.campaign-initiative-value')?.value, next.total);
  return { ...next, roll: total - next.modifier, total };
}


function renderOrderPopup(popup, store, deps, anchor) {
  const model = store.getModel();
  const session = getSession(model);
  const diagnostics = readIntegrity(store, deps);
  popup.innerHTML = getOrderHTML(session, getAttackHTML(model, diagnostics));
  renderOrderList(popup, model, diagnostics);
  syncActiveTokenHighlights(store.map, new CampaignMapInitiativeModel(model.initiative));
  bindOrderActions(popup, store, deps, anchor);
  bindAttackActions(popup, store, deps);
  if (!popup.classList.contains('hidden')) {
    positionPopupNearAnchor(popup, anchor, {
      avoid: () => document.querySelector('.campaign-map-properties-panel')
    });
  }
}


function renderParticipantPicker(popup, store, deps, anchor) {
  renderPickerPopup(popup, store.getModel());
  bindPickerActions(popup, store, deps, anchor);
  positionPopupNearAnchor(popup, anchor, {
    avoid: () => document.querySelector('.campaign-map-properties-panel')
  });
}


function bindOrderActions(popup, store, deps, anchor) {
  const bind = (selector, operation, options) => {
    popup.querySelector(selector)?.addEventListener('click', event => {
      event.preventDefault();
      void runPopupAction(popup, store, deps, anchor, operation, options);
    });
  };
  bind('.campaign-initiative-prev-btn', () => shiftInitiativeTurn(popup, store, -1), { auditOperation: 'previous' });
  bind('.campaign-initiative-next-btn', () => shiftInitiativeTurn(popup, store, 1), { auditOperation: 'next' });
  bind('.campaign-initiative-save-order-btn', () => saveOrderValues(popup, store, { sort: true }));
  const lifecycle = operation => () => getPendingOrderInputs(popup, store).length
    ? { ok: false, reason: 'pending-initiative-input' } : operation();
  bind('.campaign-combat-start-btn', lifecycle(() => store.startCombatSession()), { auditOperation: 'start' });
  bind('.campaign-combat-pause-btn', lifecycle(() => store.pauseCombatSession()), { auditOperation: 'pause' });
  bind('.campaign-combat-resume-btn', lifecycle(() => store.resumeCombatSession()), { auditOperation: 'resume' });
  bind('.campaign-combat-finish-btn', lifecycle(() => store.finishCombatSession()), { auditOperation: 'finish' });
  bind('.campaign-combat-prepare-btn', lifecycle(() => store.prepareNextCombatSession()), { showPicker: true, auditOperation: 'prepare-next' });
  bindOrderListActions(popup, store, deps, anchor);
  popup.querySelector('.campaign-initiative-edit-btn')?.addEventListener('click', event => {
    event.preventDefault();
    if (isFrozen(store.getModel())) return;
    if (getPendingOrderInputs(popup, store).length) {
      showMessage(popup, rejectionText('pending-initiative-input'));
      return;
    }
    if (hasUnresolvedMembership(store.getModel())) {
      showMessage(popup, rejectionText('roster-mismatch'));
      return;
    }
    renderParticipantPicker(popup, store, deps, anchor);
    popup.querySelector('.campaign-initiative-checkbox, .campaign-initiative-close-btn')?.focus();
  });
  popup.querySelector('.campaign-initiative-close-btn').addEventListener('click', closeMapPopup);
}


function bindAttackActions(popup, store, deps) {

  const form = popup.querySelector('.campaign-combat-attack-form');

  if (!form) return;

  popup.querySelector('.campaign-combat-history-btn')?.addEventListener('click', event => {
    event.preventDefault();
    closeMapPopup();
    document.getElementById('eventHistoryBtn')?.click();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    void submitCombatAttack(form, popup, store, deps);
  });
}


async function submitCombatAttack(form, popup, store, deps) {

  if (form.dataset.pending === 'true') return;

  const model = store.getModel();
  const session = getSession(model);
  const initiative = new CampaignMapInitiativeModel(model.initiative);
  const actor = initiative.getParticipant(initiative.activeParticipantId);
  const field = name => form.elements.namedItem(name);
  const status = form.querySelector('.campaign-combat-attack-result');

  let request;

  try {

    const createId = deps.createCombatActionId || (() => crypto.randomUUID());
    const intentId = createId();

    request = createManualCombatAttackRequest({
      actionId: `combat-action:${intentId}`,
      definitionId: `manual-attack:${intentId}`,
      componentId: `damage:${intentId}`,
      mapPageId: deps.getMapPageId?.(),
      sessionId: session?.sessionId,
      actorParticipantId: actor?.participantId,
      targetParticipantId: field('targetParticipantId')?.value,
      label: field('attackLabel')?.value,
      attackFormula: field('attackFormula')?.value,
      damageFormula: field('damageFormula')?.value,
      damageType: field('damageType')?.value
    });

  } catch (error) {

    renderAttackNotice(status, {
      tone: 'warning',
      status: 'invalid-request',
      technicalReason: error.code || error.message,
      message: '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435, \u0446\u0435\u043b\u044c \u0438 \u0444\u043e\u0440\u043c\u0443\u043b\u044b \u0430\u0442\u0430\u043a\u0438.'
    });

    return;
  }

  form.dataset.pending = 'true';
  form.setAttribute('aria-busy', 'true');

  const controls = [...form.querySelectorAll('[data-combat-attack-control]')];
  const disabled = controls.map(control => control.disabled);

  controls.forEach(control => { control.disabled = true; });
  renderAttackNotice(status, {
    tone: 'neutral',
    status: 'pending',
    technicalReason: '',
    message: '\u0410\u0442\u0430\u043a\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f\u2026'
  });

  let result;

  try {

    const run = deps.executeCombatAttack || executeCombatAttack;

    result = await run(request, {
      getMapContext: () => ({
        mapPageId: deps.getMapPageId?.(),
        mapModel: store.getModel(),
        dirty: store.isDirty()
      }),
      resolvePage: deps.resolvePage,
      ...(deps.combatAttackExecutionOptions || {})
    });

  } catch (error) {

    result = {
      ok: false,
      state: 'unchanged',
      audit: 'not-attempted',
      reason: error.code || error.message
    };
  }

  if (popup.contains(form)) {

    renderAttackNotice(status, createCombatAttackPresentation(result));

    if (result?.ok && result.audit === 'durable') {

      const targetTokenId = result.resolution?.target?.tokenId;
      const token = targetTokenId
        ? store.map?.querySelector(`.campaign-map-token[data-token-id="${CSS.escape(targetTokenId)}"]`)
        : null;

      try {
        if (token) deps.applyTokenHealthState?.(token, null, { publish: false });
      } catch {
        status.dataset.refresh = 'failed';
      }
    }

    delete form.dataset.pending;
    form.removeAttribute('aria-busy');
    controls.forEach((control, index) => { control.disabled = disabled[index]; });
  }
}


function renderAttackNotice(node, presentation) {

  if (!node) return;

  node.dataset.status = presentation.status;
  node.dataset.reason = presentation.technicalReason || '';
  node.dataset.tone = presentation.tone || 'neutral';

  if (!presentation.attackTotal && presentation.attackTotal !== 0) {
    node.textContent = presentation.message;
    return;
  }

  const health = presentation.healthBefore && presentation.healthAfter
    ? `<div class="campaign-combat-attack-health">
        <span>HP: <strong>${escapeHTML(presentation.healthBefore.hpCurrent)} \u2192 ${escapeHTML(presentation.healthAfter.hpCurrent)}</strong></span>
        <span>Temp HP: <strong>${escapeHTML(presentation.healthBefore.hpTemp)} \u2192 ${escapeHTML(presentation.healthAfter.hpTemp)}</strong></span>
      </div>`
    : '<div class="campaign-combat-attack-health">HP \u043d\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u044b</div>';

  node.innerHTML = `
    <strong>${escapeHTML(presentation.label)} \u2014 ${escapeHTML(presentation.message)}</strong>
    <div class="campaign-combat-attack-rolls">
      <span>\u0410\u0442\u0430\u043a\u0430: <strong>${escapeHTML(presentation.attackTotal)}</strong></span>
      <span>\u041a\u0417: <strong>${escapeHTML(presentation.armorClass)}</strong></span>
      ${presentation.damageAmount === null ? '' : `<span>\u0423\u0440\u043e\u043d: <strong>${escapeHTML(presentation.damageAmount)} ${escapeHTML(presentation.damageType)}</strong></span>`}
    </div>
    ${health}`;
}


function renderOrderList(popup, model, diagnostics) {
  const initiative = new CampaignMapInitiativeModel(model.initiative);
  const session = getSession(model);
  const members = new Map((session?.participants || []).map(member => [member.participantId, member]));
  const issues = new Map();
  for (const issue of diagnostics.issues) {
    if (!issues.has(issue.participantId)) issues.set(issue.participantId, []);
    issues.get(issue.participantId).push(issue.referenceType);
  }
  renderActiveTurn(popup, initiative);
  const list = popup.querySelector('.campaign-initiative-order-list');
  list.innerHTML = initiative.participants.map(participant => getOrderRowHTML(participant, {
    active: model.initiative.activeParticipantId === participant.participantId,
    frozen: isFrozen(model),
    member: members.get(participant.participantId),
    warnings: issues.get(participant.participantId) || []
  })).join('') || `<div class="campaign-initiative-empty">${INITIATIVE_TEXT.noParticipants}</div>`;
  const unresolved = (session?.participants || []).filter(member => !initiative.getParticipant(member.participantId));
  const problems = popup.querySelector('.campaign-combat-problems');
  if (problems) {
    problems.innerHTML = unresolved.map(member => `
      <div class="campaign-combat-unresolved" data-participant-id="${escapeAttribute(member.participantId)}">
        <strong>${escapeHTML(member.participantId)}</strong>
        ${getFlagsHTML(member, isFrozen(model))}
        ${getWarningsHTML(['initiative-participant'])}
      </div>`).join('');
    problems.parentElement.hidden = !unresolved.length;
  }
  if (diagnostics.unavailable) showMessage(popup, '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0438 \u0431\u043e\u044f.');
}


function renderActiveTurn(
  popup,
  initiative
) {

  const label =
    popup.querySelector('.campaign-initiative-active');

  const active =
    initiative.getParticipant(
      initiative.activeParticipantId
    );

  if (!label) return;

  label.textContent =
    active
      ? `${INITIATIVE_TEXT.activePrefix}: ${active.name}`
      : INITIATIVE_TEXT.noActive;
}


function shiftInitiativeTurn(popup, store, direction) {
  const initiative = readOrderValues(popup, store);
  if (getSession(store.getModel())) {
    // Combat progression (including pending values) is owned by the Store/domain.
    return direction > 0
      ? store.nextCombatTurn(initiative.toJSON())
      : store.previousCombatTurn(initiative.toJSON());
  }
  // Explicit legacy exception: preparation does not create a Combat Session.
  if (direction > 0) initiative.nextTurn();
  else initiative.previousTurn();
  return publishInitiative(store, initiative);
}


function bindOrderListActions(popup, store, deps, anchor) {
  popup.querySelectorAll('.campaign-initiative-order-row').forEach(row => {
    const select = event => {
      if (event.target.closest('.campaign-initiative-value, [data-combat-flag]')) return;
      event.preventDefault();
      void runPopupAction(popup, store, deps, anchor, () => {
        if (isFrozen(store.getModel())) return { ok: false, reason: 'turn-progression-not-allowed' };
        const initiative = readOrderValues(popup, store);
        if (!initiative.setActive(row.dataset.participantId)) return { ok: false, reason: 'participant-not-found' };
        return publishInitiative(store, initiative);
      }, { auditOperation: 'select' });
    };
    row.addEventListener('click', select);
    row.querySelector('.campaign-initiative-value').addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      void runPopupAction(popup, store, deps, anchor, () => saveOrderValues(popup, store, { sort: true }));
    });
  });
  popup.querySelectorAll('[data-combat-flag]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      void runPopupAction(popup, store, deps, anchor, () => {
        const id = button.closest('[data-participant-id]').dataset.participantId;
        const member = getSession(store.getModel())?.participants.find(member => member.participantId === id);
        if (!member) return { ok: false, reason: 'participant-not-found' };
        const key = button.dataset.combatFlag;
        return store.setCombatParticipantFlags(id, { [key]: !member[key] });
      }, { auditOperation: 'flags', participantId: button.closest('[data-participant-id]').dataset.participantId });
    });
  });
}


function saveOrderValues(popup, store, options = {}) {
  if (isFrozen(store.getModel())) return { ok: false, reason: 'roster-edit-not-allowed' };
  const initiative = readOrderValues(popup, store);
  if (options.sort) initiative.sortByInitiative();
  return publishInitiative(store, initiative);
}

function readOrderValues(popup, store) {
  const initiative = new CampaignMapInitiativeModel(store.getModel().initiative);
  popup.querySelectorAll('.campaign-initiative-order-row').forEach(row => {
    const participant = initiative.getParticipant(row.dataset.participantId);
    const input = row.querySelector('.campaign-initiative-value');
    if (!participant || !input) return;
    participant.total = normalizeNumber(input.value, participant.total);
    participant.roll = participant.total - participant.modifier;
  });
  return initiative;
}

function getSession(model) {
  return model.combatSession?.status !== 'inactive' ? model.combatSession : null;
}

function getPendingOrderInputs(popup, store) {
  const members = new Map(store.getModel().initiative.participants.map(member => [member.participantId, member]));
  return [...popup.querySelectorAll('.campaign-initiative-order-row')].flatMap(row => {
    const member = members.get(row.dataset.participantId);
    const input = row.querySelector('.campaign-initiative-value');
    return member && input.value !== String(member.total)
      ? [{ participantId: member.participantId, total: member.total, value: input.value }] : [];
  });
}

function isFrozen(model) {
  const session = getSession(model);
  return Boolean(session && session.status !== 'active');
}

function hasUnresolvedMembership(model) {
  const ids = new Set(model.initiative.participants.map(member => member.participantId));
  return getSession(model)?.participants.some(member => !ids.has(member.participantId)) || false;
}

function publishInitiative(store, initiative, { membership = false } = {}) {
  const model = store.getModel();
  if (isFrozen(model)) return { ok: false, reason: 'roster-edit-not-allowed' };
  const data = initiative.toJSON();
  if (JSON.stringify(data) === JSON.stringify(model.initiative)) return { ok: true, changed: false };
  const session = getSession(model);
  const sameMembership = session && session.participants.length === data.participants.length
    && !hasUnresolvedMembership(model);
  if (session && (membership || sameMembership)) {
    return store.setInitiativeRoster(data);
  }
  // Value/current corrections never implicitly add or discard mismatched Combat members.
  store.setInitiative(data);
  return { ok: true, changed: true };
}

function readIntegrity(store, deps) {
  if (!getSession(store.getModel())) return { issues: [] };
  try {
    return { issues: store.getCombatSessionIntegrity({ resolvePage: deps.resolvePage }).integrity.issues };
  } catch {
    return { issues: [], unavailable: true };
  }
}

function rejectionText(reason) {
  return ({
    'pending-initiative-input': '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u044b.',
    'empty-roster': '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432 \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u044b.',
    'active-participant-required': '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430 \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u044b.',
    'active-participant-not-found': '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0432 \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0435.',
    'active-participant-outside-session': '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u043d\u0435 \u0432\u0445\u043e\u0434\u0438\u0442 \u0432 \u0441\u043e\u0441\u0442\u0430\u0432 \u0431\u043e\u044f.',
    'invalid-participant': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430 \u0431\u043e\u044f.',
    'participant-not-found': '\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u0431\u043e\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.',
    'roster-mismatch': '\u0421\u043e\u0441\u0442\u0430\u0432 \u0431\u043e\u044f \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u0435\u0442 \u0441 \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u043e\u0439. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0445 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432.',
    'round-limit-exceeded': '\u0414\u043e\u0441\u0442\u0438\u0433\u043d\u0443\u0442 \u043f\u0440\u0435\u0434\u0435\u043b \u043d\u043e\u043c\u0435\u0440\u0430 \u0440\u0430\u0443\u043d\u0434\u0430.',
    'invalid-flags': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u043e\u0442\u043c\u0435\u0442\u043a\u0443 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430.',
    'no-session': '\u0411\u043e\u0439 \u0435\u0449\u0451 \u043d\u0435 \u043d\u0430\u0447\u0430\u0442.',
    'invalid-transition': '\u042d\u0442\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0438 \u0431\u043e\u044f.',
    'roster-edit-not-allowed': '\u0421\u043e\u0441\u0442\u0430\u0432 \u0438 \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0434\u043b\u044f \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u043c \u0431\u043e\u044e.',
    'turn-progression-not-allowed': '\u041f\u0435\u0440\u0435\u0445\u043e\u0434\u044b \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u043c \u0431\u043e\u044e.',
    'flags-edit-not-allowed': '\u041e\u0442\u043c\u0435\u0442\u043a\u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0434\u043b\u044f \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u043c \u0431\u043e\u044e.'
  })[reason] || '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0431\u043e\u044f.';
}

function showMessage(popup, message) {
  const node = popup.querySelector('.campaign-initiative-message');
  if (node) node.textContent = message;
}

async function runPopupAction(popup, store, deps, anchor, operation, { showPicker = false, auditOperation, participantId } = {}) {
  if (popup.getAttribute('aria-busy') === 'true') return;
  const frame = popup.firstElementChild;
  const focusKey = document.activeElement?.dataset.focusKey;
  const pendingInputs = getPendingOrderInputs(popup, store);
  const capture = () => JSON.parse(JSON.stringify({ initiative: store.getModel().initiative, combatSession: store.getModel().combatSession }));
  const before = capture();
  let result;
  try {
    result = operation();
  } catch {
    showMessage(popup, '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.');
    return;
  }
  if (!result?.ok) {
    showMessage(popup, rejectionText(result?.reason));
    return;
  }
  const after = capture();
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  popup.setAttribute('aria-busy', 'true');
  const controls = [...popup.querySelectorAll('button:not(.campaign-initiative-close-btn), input')];
  const disabled = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  let saveFailed = false;
  let auditResult;
  try {
    if (changed) {
      const receipt = await deps.saveAndSync?.();
      saveFailed = !isCombatStateSaveConfirmed(receipt);
      if (!saveFailed && auditOperation) {
        auditResult = await logCombatSessionOperation({ operation: auditOperation, before, after, participantId,
          mapPageId: receipt.mapPageId }, { saveResult: receipt, storageAdapter: receipt.storageAdapter });
      }
    }
  } catch {
    saveFailed = true;
  } finally {
    // A late save must not overwrite another map popup or reopen a closed one.
    if (popup.firstElementChild === frame) {
      popup.removeAttribute('aria-busy');
      controls.forEach((control, i) => { control.disabled = disabled[i]; });
      if (!popup.classList.contains('hidden')) {
        if (showPicker && !saveFailed) renderParticipantPicker(popup, store, deps, anchor);
        else renderOrderPopup(popup, store, deps, anchor);
        // Marker updates must not discard unrelated, still-unsubmitted form input.
        for (const pending of pendingInputs) {
          const member = store.getModel().initiative.participants.find(member => member.participantId === pending.participantId);
          const input = popup.querySelector(`[data-focus-key="value:${CSS.escape(pending.participantId)}"]`);
          if (input && member?.total === pending.total) input.value = pending.value;
        }
        if (saveFailed) showMessage(popup, '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0431\u043e\u044f. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b.');
        if (auditResult?.status === 'state-persisted-event-not-written') {
          showMessage(popup, '\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0431\u043e\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e, \u043d\u043e \u0441\u043e\u0431\u044b\u0442\u0438\u0435 \u043d\u0435 \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u043e \u0432 \u0436\u0443\u0440\u043d\u0430\u043b.');
        }
        const focusTarget = focusKey && popup.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]:not(:disabled)`);
        (focusTarget || popup.querySelector('.campaign-initiative-checkbox, .campaign-combat-resume-btn, .campaign-combat-pause-btn, .campaign-combat-start-btn, .campaign-combat-prepare-btn, .campaign-initiative-close-btn'))?.focus();
      }
    }
  }
  return { status: saveFailed ? 'state-not-persisted' : auditResult?.status || (changed ? 'durable' : 'unchanged') };
}


function getNextActiveParticipantId(
  currentActiveId,
  participants
) {

  if (
    participants.some(participant =>
      participant.participantId === currentActiveId
    )
  ) {

    return currentActiveId;
  }

  return participants[0]?.participantId || '';
}


function getPickerHTML() {

  return getMapPopupFrameHTML({
    title: INITIATIVE_TEXT.title,
    icon: 'skill',
    children: `
      <div class="campaign-initiative-message" role="status" aria-live="polite"></div>
      <div class="campaign-initiative-scroll">${getMapPopupSectionHTML({
        label: INITIATIVE_TEXT.edit,
        key: 'participants',
        children: '<div class="campaign-initiative-list"></div>'
      })}</div>
      <div class="campaign-map-popup-actions campaign-initiative-actions">
        <button class="campaign-initiative-save-btn" type="button">${INITIATIVE_TEXT.apply}</button>
        <button class="campaign-initiative-roll-btn" type="button">${INITIATIVE_TEXT.rollAll}</button>
        <button class="campaign-initiative-close-btn" type="button">${INITIATIVE_TEXT.close}</button>
      </div>
    `
  });
}


function getOrderHTML(session, attackHTML = '') {
  const frozen = Boolean(session && session.status !== 'active');
  const statusText = { active: '\u0410\u043a\u0442\u0438\u0432\u0435\u043d', paused: '\u041f\u0430\u0443\u0437\u0430', finished: '\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d' }[session?.status];
  const lifecycle = session?.status === 'finished'
    ? '<button class="mow-button campaign-combat-prepare-btn" data-focus-key="prepare" type="button">\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u043d\u043e\u0432\u044b\u0439 \u0431\u043e\u0439</button>'
    : !session
    ? '<button class="mow-button campaign-combat-start-btn" data-focus-key="start" type="button">\u041d\u0430\u0447\u0430\u0442\u044c \u0431\u043e\u0439</button>'
    : `<button class="mow-button campaign-combat-${session.status === 'paused' ? 'resume' : 'pause'}-btn" data-focus-key="lifecycle" type="button">${session.status === 'paused' ? '\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c' : '\u041f\u0430\u0443\u0437\u0430'}</button>
       <button class="mow-button campaign-combat-finish-btn" data-focus-key="finish" type="button">\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0431\u043e\u0439</button>`;
  return getMapPopupFrameHTML({
    title: session ? '\u0411\u043e\u0439 \u0438 \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0430' : INITIATIVE_TEXT.turnTitle,
    icon: 'skill',
    children: `
      ${session ? `<div class="campaign-combat-summary" role="status">
        <strong class="campaign-combat-round">\u0420\u0430\u0443\u043d\u0434 ${session.round}</strong>
        <span class="campaign-combat-status">${statusText}</span>
      </div>` : ''}
      <div class="campaign-initiative-message" role="status" aria-live="polite"></div>
      ${getMapPopupSectionHTML({
        label: INITIATIVE_TEXT.activePrefix, key: 'turn',
        children: `<div class="campaign-initiative-turn">
          <button class="mow-icon-button campaign-initiative-prev-btn" data-focus-key="previous" type="button" title="${INITIATIVE_TEXT.previous}" aria-label="${INITIATIVE_TEXT.previous}" ${frozen ? 'disabled' : ''}>${iconSvg('skip-back')}</button>
          <span class="campaign-initiative-active" aria-live="polite">${INITIATIVE_TEXT.noActive}</span>
          <button class="mow-icon-button campaign-initiative-next-btn" data-focus-key="next" type="button" title="${INITIATIVE_TEXT.next}" aria-label="${INITIATIVE_TEXT.next}" ${frozen ? 'disabled' : ''}>${iconSvg('skip-forward')}</button>
        </div>`
      })}
      <div class="campaign-initiative-scroll">
      ${attackHTML}
      ${getMapPopupSectionHTML({ label: INITIATIVE_TEXT.turnTitle, key: 'order', children: '<div class="campaign-initiative-order-list"></div>' })}
      ${session ? getMapPopupSectionHTML({ label: '\u041f\u0440\u043e\u0431\u043b\u0435\u043c\u044b \u0431\u043e\u044f', key: 'combat-problems', children: '<div class="campaign-combat-problems"></div>' }) : ''}
      </div>
      <div class="campaign-map-popup-actions campaign-combat-lifecycle">${lifecycle}</div>
      <div class="campaign-map-popup-actions campaign-initiative-actions campaign-initiative-order-actions">
        <button class="mow-button campaign-initiative-save-order-btn" data-focus-key="order" type="button" ${frozen ? 'disabled' : ''}>${INITIATIVE_TEXT.saveOrder}</button>
        <button class="mow-button campaign-initiative-edit-btn" data-focus-key="edit" type="button" ${frozen ? 'disabled' : ''}>${INITIATIVE_TEXT.edit}</button>
        <button class="mow-button campaign-initiative-close-btn" data-focus-key="close" type="button">${INITIATIVE_TEXT.close}</button>
      </div>`
  });
}


function getAttackHTML(model, diagnostics) {

  const session = getSession(model);

  if (!session) return '';

  const initiative = new CampaignMapInitiativeModel(model.initiative);
  const actor = initiative.getParticipant(initiative.activeParticipantId);
  const memberIds = new Set(session.participants.map(member => member.participantId));
  const issueIds = new Set((diagnostics.issues || []).map(issue => issue.participantId));
  const sessionActive = session.status === 'active';
  const actorValid = Boolean(actor && memberIds.has(actor.participantId) && !issueIds.has(actor.participantId));
  const targets = session.participants
    .filter(member => member.participantId !== actor?.participantId)
    .map(member => {
      const participant = initiative.getParticipant(member.participantId);
      const sameCharacter = Boolean(actor?.pageId && participant?.pageId && actor.pageId === participant.pageId);
      const unavailable = !participant || issueIds.has(member.participantId) || sameCharacter;
      const label = participant?.name || member.participantId;
      const reason = sameCharacter
        ? ' \u2014 \u0442\u043e\u0442 \u0436\u0435 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u0436'
        : unavailable ? ' \u2014 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d' : '';
      return {
        unavailable,
        html: `<option value="${escapeAttribute(member.participantId)}" ${unavailable ? 'disabled' : ''}>${escapeHTML(label + reason)}</option>`
      };
    });
  const usableTargetCount = targets.filter(target => !target.unavailable).length;
  const unavailableReason = !sessionActive
    ? '\u0410\u0442\u0430\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u043c \u0431\u043e\u044e.'
    : !actorValid
    ? '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u0431\u043e\u044f \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.'
    : !usableTargetCount
    ? '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0439 \u0446\u0435\u043b\u0438.'
    : '';
  const disabled = unavailableReason ? 'disabled' : '';

  return getMapPopupSectionHTML({
    label: '\u0410\u0442\u0430\u043a\u0430',
    key: 'attack',
    children: `
      <form class="campaign-combat-attack-form">
        <div class="campaign-combat-attack-actor">
          <span>\u0410\u0442\u0430\u043a\u0443\u044e\u0449\u0438\u0439</span>
          <strong data-combat-attack-actor-id="${escapeAttribute(actor?.participantId || '')}">${escapeHTML(actor?.name || '\u041d\u0435\u0442 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430')}</strong>
        </div>
        <div class="campaign-combat-attack-grid">
          <label class="campaign-combat-attack-field campaign-combat-attack-field-wide">
            <span>\u0426\u0435\u043b\u044c</span>
            <select class="mow-input" name="targetParticipantId" data-combat-attack-control ${disabled} required>
              ${usableTargetCount ? '<option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0446\u0435\u043b\u044c</option>' : ''}
              ${targets.map(target => target.html).join('')}
            </select>
          </label>
          <label class="campaign-combat-attack-field campaign-combat-attack-field-wide">
            <span>\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435</span>
            <input class="mow-input" name="attackLabel" data-combat-attack-control ${disabled} required autocomplete="off" placeholder="Shortbow">
          </label>
          <label class="campaign-combat-attack-field">
            <span>\u0410\u0442\u0430\u043a\u0430</span>
            <input class="mow-input" name="attackFormula" data-combat-attack-control ${disabled} required autocomplete="off" spellcheck="false" placeholder="d20 + 4">
          </label>
          <label class="campaign-combat-attack-field">
            <span>\u0423\u0440\u043e\u043d</span>
            <input class="mow-input" name="damageFormula" data-combat-attack-control ${disabled} required autocomplete="off" spellcheck="false" placeholder="1d6 + 2">
          </label>
          <label class="campaign-combat-attack-field campaign-combat-attack-field-wide">
            <span>\u0422\u0438\u043f \u0443\u0440\u043e\u043d\u0430</span>
            <input class="mow-input" name="damageType" data-combat-attack-control ${disabled} required autocomplete="off" placeholder="piercing">
          </label>
        </div>
        ${unavailableReason ? `<p class="campaign-combat-attack-unavailable">${escapeHTML(unavailableReason)}</p>` : ''}
        <div class="campaign-combat-attack-actions">
          <button class="mow-button campaign-combat-attack-submit" type="submit" data-focus-key="attack" data-combat-attack-control ${disabled}>\u0410\u0442\u0430\u043a\u043e\u0432\u0430\u0442\u044c</button>
          <button class="mow-button campaign-combat-history-btn" type="button">\u0418\u0441\u0442\u043e\u0440\u0438\u044f</button>
        </div>
        <div class="campaign-combat-attack-result" role="status" aria-live="polite" aria-atomic="true"></div>
      </form>`
  });
}


function getPickerRowHTML(
  token,
  participant,
  options = {}
) {

  const nextParticipant =
    participant ||
    createParticipantFromToken(
      token
    );

  return `
    <label class="campaign-initiative-row" data-participant-id="${escapeAttribute(nextParticipant.participantId)}">
      <input
        class="campaign-initiative-checkbox"
        type="checkbox"
        value="${escapeAttribute(token.tokenId)}"
        ${options.selected ? 'checked' : ''}
      >
      <span class="campaign-initiative-name">${escapeHTML(nextParticipant.name)}</span>
      <span class="campaign-initiative-meta">${escapeHTML(getParticipantMetaText(nextParticipant))}</span>
      <input
        class="campaign-initiative-value"
        type="number"
        value="${escapeAttribute(getParticipantTotal(nextParticipant))}"
        data-modifier="${escapeAttribute(nextParticipant.modifier)}"
        title="${INITIATIVE_TEXT.initiative}" aria-label="${escapeAttribute(INITIATIVE_TEXT.initiative + ': ' + nextParticipant.name)}"
      >
    </label>
  `;
}


function getOrderRowHTML(participant, options = {}) {
  return `
    <div class="${getOrderRowClass(options)}" data-participant-id="${escapeAttribute(participant.participantId)}">
      <div class="campaign-initiative-main">
      <div class="campaign-initiative-identity">
      <button class="mow-button campaign-initiative-name campaign-initiative-select" type="button"
        data-focus-key="select:${escapeAttribute(participant.participantId)}"
        aria-label="${escapeAttribute(INITIATIVE_TEXT.setActive + ': ' + participant.name)}"
        ${options.active ? 'aria-current="true"' : ''} ${options.frozen ? 'disabled' : ''}>
        ${escapeHTML(participant.name)}
      </button>
      ${options.active ? '<span class="campaign-initiative-current-label">\u0425\u043e\u0434</span>' : ''}
      </div>
      <div class="campaign-initiative-score">
      <input class="mow-input campaign-initiative-value" type="number"
        value="${escapeAttribute(participant.total)}" data-modifier="${escapeAttribute(participant.modifier)}"
        data-focus-key="value:${escapeAttribute(participant.participantId)}"
        aria-label="${escapeAttribute(INITIATIVE_TEXT.initiative + ': ' + participant.name)}"
        ${options.frozen ? 'disabled' : ''}>
      <span class="campaign-initiative-result">${escapeHTML(getParticipantResultText(participant))}</span>
      </div>
      </div>
      ${options.member ? getFlagsHTML(options.member, options.frozen) : ''}
      ${getWarningsHTML(options.warnings || [])}
    </div>`;
}

function getFlagsHTML(member, frozen) {
  return `<div class="campaign-combat-flags" role="group" aria-label="\u041e\u0442\u043c\u0435\u0442\u043a\u0438 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430">
    ${[['ready', '\u0413\u043e\u0442\u043e\u0432'], ['delayed', '\u041e\u0442\u043b\u043e\u0436\u0435\u043d']].map(([key, label]) => `
      <button class="mow-button campaign-combat-flag" type="button" data-combat-flag="${key}"
        data-focus-key="${key}:${escapeAttribute(member.participantId)}"
        aria-pressed="${member[key]}" ${frozen ? 'disabled' : ''}>${label}</button>`).join('')}
  </div>`;
}

function getWarningsHTML(types) {
  const labels = {
    'initiative-participant': '\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u044b',
    token: '\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0442\u043e\u043a\u0435\u043d',
    page: '\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430'
  };
  return types.length ? `<div class="campaign-combat-warnings">${types.map(type => `<div class="campaign-combat-warning">${escapeHTML(labels[type])}</div>`).join('')}</div>` : '';
}


function getOrderRowClass(
  options
) {

  return [
    'campaign-initiative-row',
    'campaign-initiative-order-row',
    options.active
      ? 'is-active'
      : ''
  ]
    .filter(Boolean)
    .join(' ');
}


function getParticipantMetaText(
  participant
) {

  return participant.sourceMode === 'original'
    ? INITIATIVE_TEXT.player
    : INITIATIVE_TEXT.duplicate;
}


function getParticipantTotal(
  participant
) {

  return Number.isFinite(
    participant?.total
  )
    ? participant.total
    : '';
}


function getParticipantResultText(
  participant
) {

  const modifier =
    participant.modifier >= 0
      ? `+${participant.modifier}`
      : String(participant.modifier);

  return `${participant.roll}${modifier}`;
}


function syncActiveTokenHighlights(
  map,
  initiative
) {

  map
    ?.querySelectorAll('.campaign-map-token[data-initiative-active="true"]')
    .forEach(token => {

      delete token.dataset.initiativeActive;

      token.classList.remove(
        'is-initiative-active'
      );
    });

  const active =
    initiative.getParticipant(
      initiative.activeParticipantId
    );

  if (!active?.tokenId) return;

  const token =
    map?.querySelector(
      `.campaign-map-token[data-token-id="${CSS.escape(active.tokenId)}"]`
    );

  if (!token) return;

  token.dataset.initiativeActive =
    'true';

  token.classList.add(
    'is-initiative-active'
  );
}


function normalizeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}
