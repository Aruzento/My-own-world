import { webcrypto } from 'node:crypto';


// Node получает тот же `crypto.randomUUID`, на который опирается браузерный код.

if (!globalThis.crypto) {

  Object.defineProperty(
    globalThis,
    'crypto',
    {
      value: webcrypto
    }
  );
}
