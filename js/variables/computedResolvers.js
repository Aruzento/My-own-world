import { deepFreeze, deepCloneData } from '../cardTypes/definitionIdentity.js';
import { assertJSONData } from '../core/pageVariablesCodec.js';

// Только trusted code может передать implementations; schema выбирает exact id/version.
// Встроенных gameplay resolvers пока нет. Callback не получает IO, clock или runtime state.
export function createComputedResolverRegistry(implementations = []) {
  const entries = new Map();
  for (const entry of implementations) {
    if (typeof entry.id !== 'string' || !Number.isSafeInteger(entry.version) || entry.version < 1 || typeof entry.resolve !== 'function') {
      throw new Error('Invalid trusted resolver contract');
    }
    const key = `${entry.id}@${entry.version}`;
    if (entries.has(key)) throw new Error('Duplicate resolver contract');
    entries.set(key, entry.resolve);
  }
  return Object.freeze({
    execute(contract, inputs) {
      const resolver = entries.get(`${contract.resolverId}@${contract.version}`);
      if (!resolver) return { status: 'unsupported', reason: 'unknown-resolver' };
      try {
        const value = resolver(deepFreeze(deepCloneData(inputs)), deepFreeze(deepCloneData(contract.options || {})));
        assertJSONData(value);
        return { status: 'value', value: deepFreeze(deepCloneData(value)) };
      } catch (error) {
        return { status: 'invalid', reason: 'resolver-failed', message: String(error.message || error) };
      }
    }
  });
}

export const EMPTY_COMPUTED_RESOLVERS = createComputedResolverRegistry();
