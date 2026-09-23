import { createCharacterModel, applyCharacterHealthChange } from '../character/characterModel.js';
import { validateCombatActionRequest } from '../combat/combatActionModel.js';

function invalid(field) {
  const error = new Error(`Invalid action.resolved evidence: ${field}.`);
  Object.assign(error, { code: 'EVENT_TYPE_INVALID_PAYLOAD', field, type: 'action.resolved' });
  throw error;
}

function record(value, keys, field, optional = []) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) invalid(field);
  if (Object.keys(value).some(key => !keys.includes(key)) ||
      keys.some(key => !optional.includes(key) && !Object.hasOwn(value, key))) invalid(field);
  return value;
}
function id(value, field) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) invalid(field);
  return value;
}
function integer(value, field, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) invalid(field);
  return value;
}
function identity(value, field) {
  record(value, ['participantId', 'tokenId', 'pageId'], field);
  for (const key of Object.keys(value)) id(value[key], `${field}.${key}`);
  return { ...value };
}

export function normalizeActionResolvedPayload(value) {
  record(value, ['actionId', 'mapPageId', 'sessionId', 'round', 'actor', 'target', 'definition',
    'hitPolicy', 'defense', 'outcome', 'attackRollEventId', 'components', 'resourceEventIds', 'healthGuard'], 'payload');
  for (const key of ['actionId', 'mapPageId', 'sessionId', 'attackRollEventId']) id(value[key], key);
  integer(value.round, 'round', 1);
  const actor = identity(value.actor, 'actor');
  const target = identity(value.target, 'target');
  if (actor.pageId === target.pageId || actor.participantId === target.participantId || actor.tokenId === target.tokenId) invalid('target');
  record(value.definition, ['definitionId', 'label', 'source'], 'definition');
  id(value.definition.definitionId, 'definitionId');
  id(value.definition.label, 'label');
  record(value.definition.source, ['kind', 'pageId', 'ruleId'], 'source', ['pageId', 'ruleId']);
  if (value.definition.source.kind !== 'manual') invalid('source.kind');
  for (const key of ['pageId', 'ruleId']) if (key in value.definition.source) id(value.definition.source[key], key);
  if (value.hitPolicy !== 'ac-total-v1') invalid('hitPolicy');
  record(value.defense, ['kind', 'value'], 'defense');
  if (value.defense.kind !== 'ac' || !Number.isFinite(value.defense.value) || value.defense.value < 0) invalid('defense');
  if (!['hit', 'miss'].includes(value.outcome)) invalid('outcome');
  if (!Array.isArray(value.components) || value.components.length !== (value.outcome === 'hit' ? 1 : 0)) invalid('components');
  for (const component of value.components) {
    record(component, ['componentId', 'damageType', 'rollEventId', 'amount'], 'component');
    for (const key of ['componentId', 'damageType', 'rollEventId']) id(component[key], key);
    integer(component.amount, 'amount');
  }
  if (!Array.isArray(value.resourceEventIds) || value.resourceEventIds.length > 2) invalid('resourceEventIds');
  const linked = [value.attackRollEventId, ...value.components.map(c => c.rollEventId), ...value.resourceEventIds];
  linked.forEach(v => id(v, 'eventId'));
  if (new Set(linked).size !== linked.length) invalid('duplicate event links');
  if (value.outcome === 'miss') {
    if (value.healthGuard !== null || value.resourceEventIds.length) invalid('miss health');
  } else {
    const guard = record(value.healthGuard, ['hpMax', 'unchangedFields'], 'healthGuard');
    integer(guard.hpMax, 'hpMax', 1);
    if (!Array.isArray(guard.unchangedFields) || guard.unchangedFields.length > 2) invalid('unchangedFields');
    const fields = new Set();
    for (const entry of guard.unchangedFields) {
      record(entry, ['field', 'value'], 'unchangedField');
      if (!['hpTemp', 'hpCurrent'].includes(entry.field) || fields.has(entry.field)) invalid('unchangedField.field');
      integer(entry.value, entry.field);
      if (entry.field === 'hpCurrent' && entry.value > guard.hpMax) invalid('hpCurrent');
      fields.add(entry.field);
    }
    if (fields.size + value.resourceEventIds.length !== 2) invalid('health coverage');
  }
  return JSON.parse(JSON.stringify(value));
}

// Связи проверяются при создании и чтении транзакции, вне generic EventStore.
export function assertCombatActionTransaction(transaction) {
  const actions = transaction.events.filter(e => e.type === 'action.resolved');
  if (!actions.length && transaction.intentType !== 'combat-attack') return;
  if (actions.length !== 1 || transaction.intentType !== 'combat-attack' || transaction.status !== 'completed' ||
      transaction.reversesTransactionId || transaction.reversedByTransactionId) invalid('transaction');
  const action = actions[0];
  const p = normalizeActionResolvedPayload(action.payload);
  const ids = [p.attackRollEventId, ...p.components.map(c => c.rollEventId), ...p.resourceEventIds, action.eventId];
  if (ids.length !== transaction.events.length || new Set(ids).size !== ids.length) invalid('event coverage');
  transaction.events.forEach((event, index) => {
    if (event.eventId !== ids[index] || event.transactionId !== transaction.transactionId ||
        event.order < 1 || (index && event.order <= transaction.events[index - 1].order) ||
        event.reversesEventId || event.reversedByEventId) invalid('event order/identity');
  });
  const rollFor = eventId => {
    const event = transaction.events.find(e => e.eventId === eventId);
    if (event?.type !== 'roll.performed' || event.payload.roll.request.criticalPolicy !== 'none') invalid('roll link');
    const expected = { source: 'combat-action', actorId: p.actor.participantId, actorPageId: p.actor.pageId,
      targetId: p.target.participantId, targetPageId: p.target.pageId, mapPageId: p.mapPageId,
      tokenId: p.actor.tokenId, actionId: p.actionId };
    for (const [key, value] of Object.entries(expected)) if (event.payload.context[key] !== value) invalid(`roll.context.${key}`);
    return event.payload.roll;
  };
  const attack = rollFor(p.attackRollEventId);
  if ((attack.total >= p.defense.value ? 'hit' : 'miss') !== p.outcome) invalid('outcome');
  const component = p.components[0];
  const damage = component ? rollFor(component.rollEventId) : null;
  // Reuse the strict first-slice Dice request boundary, without executing RNG.
  validateCombatActionRequest({ kind: 'CombatActionRequest', version: 1, actionId: p.actionId,
    mapPageId: p.mapPageId, sessionId: p.sessionId, actor: { participantId: p.actor.participantId },
    target: { participantId: p.target.participantId }, action: { type: 'attack', ...p.definition,
      hitPolicy: p.hitPolicy, attackRoll: { formula: attack.request.formulaOriginal, mode: attack.request.mode, criticalPolicy: 'none' },
      damageComponents: [{ componentId: component?.componentId || 'unrolled', damageType: component?.damageType || 'unrolled',
        roll: { formula: damage?.request.formulaOriginal || '0', mode: damage?.request.mode || 'normal', criticalPolicy: 'none' } }] } });
  if (!component) return;
  if (damage.total !== component.amount) invalid('component.amount');
  const before = { current: null, temp: null, max: p.healthGuard.hpMax };
  const after = { ...before };
  const names = { hpTemp: 'temp', hpCurrent: 'current' };
  const covered = new Set();
  let lastField = -1;
  for (const eventId of p.resourceEventIds) {
    const event = transaction.events.find(e => e.eventId === eventId);
    if (event?.type !== 'resource.changed') invalid('resource link');
    const r = event.payload;
    const field = ['hpTemp', 'hpCurrent'].find(f => r.resource.id === `${p.target.pageId}:${f}`);
    const order = ['hpTemp', 'hpCurrent'].indexOf(field);
    if (!field || order <= lastField || r.resource.kind !== 'page-property' || r.unit !== 'HP') invalid('resource identity/order');
    integer(r.before, 'resource.before'); integer(r.after, 'resource.after');
    if (r.before === r.after || r.delta !== r.after - r.before) invalid('resource.delta');
    covered.add(field); lastField = order;
    before[names[field]] = r.before; after[names[field]] = r.after;
  }
  for (const g of p.healthGuard.unchangedFields) {
    if (covered.has(g.field)) invalid('duplicate health coverage');
    covered.add(g.field); before[names[g.field]] = after[names[g.field]] = g.value;
  }
  if (covered.size !== 2 || before.current > before.max || after.current > after.max) invalid('health coverage');
  const intended = applyCharacterHealthChange(createCharacterModel({ source: 'properties', health: before }), { delta: -component.amount });
  if (intended.health.current !== after.current || intended.health.temp !== after.temp || intended.health.max !== after.max) invalid('health amount');
}
