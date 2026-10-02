import { previewLegacyPropertiesMigration, executeLegacyPropertiesMigration, inspectPropertiesMigrationResume, resumeLegacyPropertiesMigration, recoverLegacyPropertiesMigration } from '../../migration/propertiesMigration.js';
import { previewInventoryAdoption, executeInventoryAdoption, inspectInventoryAdoptionResume, resumeInventoryAdoption, recoverInventoryAdoption } from '../../migration/inventoryAdoption.js';
import { previewEffectsAdoption, executeEffectsAdoption, inspectEffectsAdoptionResume, resumeEffectsAdoption, recoverEffectsAdoption } from '../../migration/effectsAdoption.js';
import { previewLegacySourceRetirement, executeLegacySourceRetirement, recoverLegacySourceRetirement, inspectLegacySourceRetirementResume, resumeLegacySourceRetirement } from '../../migration/legacySourceRetirement.js';
import { listPendingWorkspaceOperations, OPERATION_JOURNAL_FAILED_DIR, OPERATION_JOURNAL_COMMITTED_DIR } from '../../storage/operationJournal.js';
import { inspectCardTypeChangeRecovery, prepareCardTypeRecovery, commitCardTypeChange } from '../../variables/cardTypeChange.js';
import { getStorageAdapter } from '../../storage/storageAdapter.js';
import { loadWorkspace } from '../../storage/workspaceStorage.js';
import { openPage } from '../../editor/editor.js';
import { hasPendingAutosaveForPage } from '../../editor/autosave.js';
import { getPageById } from '../../repository/pageRepository.js';
import { state } from '../../state.js';
import { openConfirmPopup } from '../confirmPopup.js';
import { setStatus } from '../ui.js';
import { showOperationProgress, finishOperationProgress } from '../operationProgress.js';
import { inspectScopedTreeRecovery, recoverScopedTreeMove } from '../../storage/pageStorage.js';

const workflows = {
  properties: { label: '1. Тип и Properties', preview: previewLegacyPropertiesMigration, execute: executeLegacyPropertiesMigration,
    inspect: inspectPropertiesMigrationResume, resume: resumeLegacyPropertiesMigration, recover: recoverLegacyPropertiesMigration },
  inventory: { label: '2. Inventory и Item quantity', preview: previewInventoryAdoption, execute: executeInventoryAdoption,
    inspect: inspectInventoryAdoptionResume, resume: resumeInventoryAdoption, recover: recoverInventoryAdoption },
  effects: { label: '3. Собственные Effects', preview: previewEffectsAdoption, execute: executeEffectsAdoption,
    inspect: inspectEffectsAdoptionResume, resume: resumeEffectsAdoption, recover: recoverEffectsAdoption },
  retirement: { label: '4. Удаление доказанных legacy sources', preview: previewLegacySourceRetirement, execute: executeLegacySourceRetirement,
    inspect: inspectLegacySourceRetirementResume, resume: resumeLegacySourceRetirement,
    recover: recoverLegacySourceRetirement }
};

export async function renderMigrationSettings(container, { pageId = null } = {}) {
  container.replaceChildren();
  const section = document.createElement('section');
  section.dataset.settingsSection = 'migration';
  const heading = document.createElement('h2'); heading.textContent = 'Перевод старых карточек';
  const hint = document.createElement('p'); hint.textContent = 'Открытие workspace ничего не конвертирует. Сначала тип/Properties, затем Inventory и собственные Effects, затем finalization. Каждый шаг требует preview и подтверждения; запись защищена резервной копией.';
  const label = document.createElement('label'); label.textContent = 'Карточки (exact pageId через запятую; пусто — весь workspace)';
  const selection = document.createElement('input'); selection.className = 'mow-input'; selection.dataset.migrationPages = 'true'; label.append(selection);
  if (pageId) { selection.value = pageId; selection.readOnly = true; label.hidden = true; heading.textContent = 'Миграция этой карточки'; }
  const flowLabel = document.createElement('label'); flowLabel.textContent = 'Шаг';
  const flow = document.createElement('select'); flow.dataset.migrationStep = 'true'; flow.className = 'mow-input';
  for (const [value, workflow] of Object.entries(workflows)) { const option = document.createElement('option'); option.value = value; option.textContent = workflow.label; flow.append(option); }
  flowLabel.append(flow);
  const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.textContent = 'Предпросмотр'; previewButton.className = 'mow-button';
  const executeButton = document.createElement('button'); executeButton.type = 'button'; executeButton.textContent = 'Выполнить готовые'; executeButton.className = 'mow-button'; executeButton.disabled = true;
  const report = document.createElement('pre'); report.setAttribute('role', 'status'); report.dataset.migrationReport = 'true';
  const recoveryLabel = document.createElement('label'); recoveryLabel.textContent = 'Backup id для явного восстановления';
  const recoveryId = document.createElement('input'); recoveryId.className = 'mow-input'; recoveryLabel.append(recoveryId);
  const recovery = document.createElement('button'); recovery.type = 'button'; recovery.textContent = 'Восстановить backup'; recovery.className = 'mow-button';
  let preview = null, previewStep = null;
  const invalidate = () => { preview = null; executeButton.disabled = true; };
  flow.addEventListener('change', invalidate); selection.addEventListener('input', invalidate);
  const reload = async () => { const id = state.currentPage?.id; await loadWorkspace(); const page = id && getPageById(id); if (page) await openPage(page); };
  let running = false;
  const progress = value => { showOperationProgress(value); report.textContent = `${value.label || 'Операция'}: ${value.stage || ''} ${value.total ? `${value.current}/${value.total}` : ''}`; };
  const run = async action => {
    if (running) return false;
    running = true;
    executeButton.disabled = true; previewButton.disabled = true;
    progress({ label: 'Операция', stage: 'подготовка' });
    try {
      if (state.currentPage && hasPendingAutosaveForPage(state.currentPage.id)) throw new Error('Сначала сохраните текст и повторите preview');
      const result = await action(); report.textContent = JSON.stringify(result, null, 2);
      const successful = ['completed', 'partial', 'saved', 'verified-skip', 'skipped', 'already-original'].includes(result.status) || result.restoredPages !== undefined;
      finishOperationProgress({ message: `Операция: ${result.status || 'восстановлено'}${result.reason ? `; ${result.reason}` : ''}`, status: successful ? 'complete' : 'failed' });
      setStatus(`Миграция: ${result.status || 'не подтверждена'}${result.backupId ? `; backup ${result.backupId}` : ''}${result.reason ? `; ${result.reason}` : ''}`);
      if (result.backupId) recoveryId.value = result.backupId;
      if (['completed', 'partial', 'saved'].includes(result.status) || result.restoredPages !== undefined) await reload();
      return successful ? result : false;
    } catch (error) { report.textContent = `Операция не подтверждена: ${error.message}. Не повторяйте uncertain write; используйте inspect/resume или backup recovery.`; finishOperationProgress({ message: report.textContent, status: 'failed' }); throw error; }
    finally { running = false; previewButton.disabled = false; }
  };
  previewButton.addEventListener('click', async () => {
    invalidate(); previewButton.disabled = true;
    try {
      const ids = pageId ? [pageId] : selection.value.split(',').map(id => id.trim()).filter(Boolean);
      previewStep = flow.value;
      preview = await workflows[previewStep].preview({ ...(ids.length ? { pageIds: ids } : {}) });
      report.textContent = JSON.stringify(preview.actors || preview.plans || preview.summary, null, 2);
      executeButton.disabled = !(preview.actors || preview.plans || preview.pages || []).some(candidate => candidate.status === 'ready');
    } catch (error) { report.textContent = `Preview недоступен: ${error.message}`; }
    finally { previewButton.disabled = false; }
  });
  executeButton.addEventListener('click', () => {
    const current = preview, step = previewStep;
    if (!current || step !== flow.value) return;
    openConfirmPopup({ anchor: executeButton, modal: true, waitForConfirm: true, title: workflows[step].label,
      message: 'Выполнить только ready candidates из этого preview? Перед первым изменением создаётся и проверяется полная резервная копия.',
      confirmText: 'Выполнить', onConfirm: (_, feedback) => run(() => workflows[step].execute(current, { confirm: true, onProgress: value => { progress(value); feedback.setProgress(report.textContent); } })) });
  });
  recovery.addEventListener('click', () => {
    const id = recoveryId.value.trim(), workflow = workflows[flow.value]; if (!id) return;
    openConfirmPopup({ anchor: recovery, modal: true, waitForConfirm: true, title: 'Восстановить исходный workspace?',
      message: 'Будет создана pre-restore safety backup. Восстановление вернёт страницы/assets и не перематывает Event History.', confirmText: 'Восстановить',
      onConfirm: () => run(() => workflow.recover(id, { confirm: true, onProgress: progress })) });
  });
  section.append(heading, hint, label, flowLabel, previewButton, executeButton, report, recoveryLabel, recovery);
  const pending = [...await listPendingWorkspaceOperations(),
    ...await listPendingWorkspaceOperations(getStorageAdapter(), OPERATION_JOURNAL_FAILED_DIR),
    ...(await listPendingWorkspaceOperations(getStorageAdapter(), OPERATION_JOURNAL_COMMITTED_DIR)).filter(entry => ['card-type-change', 'scoped-tree-move'].includes(entry.type))];
  const treeOperations = new Set();
  for (const journal of pending.filter(entry => entry.type === 'scoped-tree-move')) {
    if (treeOperations.has(journal.id)) continue;
    treeOperations.add(journal.id);
    const row = document.createElement('div'); row.textContent = `Перенос карточек: ${journal.id}. Scoped recovery без full backup.`;
    const inspect = document.createElement('button'); inspect.type = 'button'; inspect.textContent = 'Проверить перенос';
    inspect.addEventListener('click', async () => {
      try { const result = await inspectScopedTreeRecovery(journal.id); report.textContent = JSON.stringify({ ...result, journal: undefined }, null, 2); }
      catch (error) { report.textContent = error.message; }
    });
    const restore = document.createElement('button'); restore.type = 'button'; restore.textContent = 'Восстановить до переноса';
    restore.addEventListener('click', () => openConfirmPopup({ anchor: restore, modal: true, waitForConfirm: true,
      title: 'Восстановить перенос?', message: 'Только exact original/target bytes. Изменённая третья версия блокирует recovery. Текущее состояние защищается новым scoped journal.',
      confirmText: 'Восстановить', onConfirm: () => run(() => recoverScopedTreeMove(journal.id, { confirm: true, onProgress: progress })) }));
    row.append(inspect, restore); section.append(row);
  }
  const typeOperations = new Set();
  for (const journal of pending.filter(entry => entry.type === 'card-type-change')) {
    if (typeOperations.has(journal.id)) continue;
    typeOperations.add(journal.id);
    const row = document.createElement('div');
    row.textContent = `Смена типа: ${journal.id}. Recovery затрагивает только карточку; shared catalog не откатывается.`;
    const inspect = document.createElement('button'); inspect.type = 'button'; inspect.textContent = 'Проверить recovery';
    inspect.addEventListener('click', async () => {
      try { report.textContent = JSON.stringify(await inspectCardTypeChangeRecovery(journal.id), null, 2); }
      catch (error) { report.textContent = `Recovery недоступен: ${error.message}`; }
    });
    const recover = document.createElement('button'); recover.type = 'button'; recover.textContent = 'Восстановить карточку до смены типа';
    recover.addEventListener('click', async () => {
      try {
        if (state.currentPage && hasPendingAutosaveForPage(state.currentPage.id)) throw new Error('Сначала сохраните текст');
        const plan = await prepareCardTypeRecovery(journal.id);
        openConfirmPopup({ anchor: recover, modal: true, title: 'Восстановить карточку?', waitForConfirm: true,
          message: 'Только exact planned state. Third-state конфликт блокируется. Текущее состояние защищается scoped recovery-копией; definitions других карточек не удаляются.',
          confirmText: 'Восстановить', onConfirm: (_, feedback) => run(() => commitCardTypeChange(plan, { confirm: true, onProgress: feedback.setProgress })) });
      } catch (error) { report.textContent = `Recovery не подтверждён: ${error.message}`; }
    });
    row.append(inspect, recover); section.append(row);
  }
  for (const journal of pending.filter(entry => ['properties-migration', 'inventory-adoption', 'effects-adoption', 'legacy-retirement'].includes(entry.type))) {
    const workflow = workflows[journal.type === 'properties-migration' ? 'properties' : journal.type === 'inventory-adoption' ? 'inventory' : journal.type === 'effects-adoption' ? 'effects' : 'retirement'];
    const row = document.createElement('p'); row.textContent = `Незавершено: ${journal.id}; backup: ${journal.before?.backupId || '—'}`;
    if (workflow.inspect) {
      const inspect = document.createElement('button'); inspect.type = 'button'; inspect.textContent = 'Проверить durable state';
      inspect.addEventListener('click', async () => {
        try { report.textContent = JSON.stringify(await workflow.inspect(journal.type === 'properties-migration' ? journal : journal.id), null, 2); }
        catch (error) { report.textContent = error.message; }
      }); row.append(inspect);
      const resume = document.createElement('button'); resume.type = 'button'; resume.textContent = 'Продолжить';
      resume.addEventListener('click', () => openConfirmPopup({ anchor: resume, modal: true, waitForConfirm: true, title: 'Продолжить проверенную операцию?',
        message: 'Exact source → pending; exact target → verified-skip; третье состояние блокирует продолжение.', confirmText: 'Продолжить',
        onConfirm: () => run(() => workflow.resume(journal.type === 'properties-migration' ? journal : journal.id, { confirm: true, onProgress: progress })) })); row.append(resume);
    }
    section.append(row);
  }
  container.append(section);
}
