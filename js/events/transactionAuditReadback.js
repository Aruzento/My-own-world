import { createTransactionRecord, readTransactionRecords } from './eventStore.js';

// Один диагностический readback: найденные bytes не превращают исключение append в успех.
export async function inspectTransactionAudit(transaction, storageAdapter) {
  try {
    const snapshot = await readTransactionRecords({ storageAdapter });
    const matches = snapshot.transactions.filter(item => item.transactionId === transaction.transactionId);
    if (!snapshot.invalidRecordCount && matches.length === 1 && JSON.stringify(createTransactionRecord(matches[0])) === JSON.stringify(createTransactionRecord(transaction))) {
      return { status: 'exact-transaction-found' };
    }
    return { status: matches.length || snapshot.invalidRecordCount ? 'corrupt-or-inconsistent' : 'absent',
      invalidRecordCount: snapshot.invalidRecordCount };
  } catch (error) {
    return { status: 'unreadable', message: String(error.message || error) };
  }
}
