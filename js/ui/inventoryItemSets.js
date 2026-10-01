import { state } from '../state.js';
import * as PageRepository from '../repository/pageRepository.js';
import { prepareInventoryContext, readInventorySource, prepareInventoryChange, commitInventoryChange } from '../character/structuredInventory.js';
import { getCurrentEditorPageBase, advanceEditorPageBase } from '../editor/editorSessionBase.js';
import { hasPendingAutosaveForPage } from '../editor/autosave.js';
import { escapeHTML } from '../taskTracker/taskTrackerEscapeHTML.js';
import { setStatus } from './ui.js';

const sets = new WeakMap();
const pending = new Set();

export function getInventorySetState(element) {
  const block = element?.closest?.('.item-set-block, .universal-list-block');
  const captured = block ? sets.get(block) : null;
  if (!captured) return null;
  const page = PageRepository.getPageById(captured.pageId);
  const current = readInventorySource(page, captured.context);
  return ['entity', 'unavailable'].includes(current.source) ? captured : null;
}

export function clearInventoryItemSetProjection(block) {
  block.querySelector('.inventory-runtime')?.remove();
  sets.delete(block);
}

export async function renderInventoryItemSets(editor) {
  const page = state.currentPage;
  if (!page || !editor) return;
  const blocks = [...editor.querySelectorAll('.item-set-block, .universal-list-block')];
  const context = blocks.length ? await prepareInventoryContext({ page, repository: PageRepository }) : null;
  if (state.currentPage !== page || !editor.isConnected) return;
  const inventory = context ? readInventorySource(page, context) : null;
  for (const block of blocks) {
    clearInventoryItemSetProjection(block);
    if (context.mode === 'not-inventory') continue;
    if (block.classList.contains('universal-list-block') &&
        (block.querySelector('.universal-list-kind')?.value || block.dataset.listKind || 'items') !== 'items') continue;
    sets.set(block, { pageId: page.id, context, inventory });
    if (!['entity', 'unavailable'].includes(inventory.source)) continue;
    const runtime = document.createElement('div');
    runtime.className = 'inventory-runtime';
    runtime.dataset.runtime = 'true';
    runtime.contentEditable = 'false';
    if (inventory.status !== 'ready') {
      runtime.textContent = 'Инвентарь недоступен: ' + (inventory.diagnostics[0]?.reason || 'source-unavailable');
    } else {
      const list = document.createElement('div');
      list.className = block.classList.contains('universal-list-block') ? 'universal-list-list' : 'item-set-list';
      for (const item of inventory.items) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'item-set-chip';
        chip.dataset.pageId = item.pageId;
        chip.innerHTML = `<span class="item-set-title">${escapeHTML(item.title)}</span>
          <label class="item-set-quantity-label" title="Количество в карточке предмета">
            <input class="item-set-quantity" type="text" inputmode="numeric" value="${escapeHTML(String(item.quantity))}" ${item.quantityWritable ? '' : 'disabled'}>
          </label><span class="item-set-remove" title="Удалить из инвентаря">×</span>`;
        if (item.equipped) chip.title = 'Экипирован';
        list.appendChild(chip);
      }
      runtime.appendChild(list);
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'item-set-add-btn';
      add.textContent = '+ Предмет';
      runtime.appendChild(add);
    }
    block.appendChild(runtime);
  }
}

// Explicit Item creation can activate its definition. Refresh before preparing the parent plan,
// without retrying an old plan or changing the editor whole-page base.
export async function refreshInventoryItemSetContext(element) {
  const captured = getInventorySetState(element);
  const page = captured && PageRepository.getPageById(captured.pageId);
  if (!page || state.currentPage !== page) throw new Error('Inventory page changed after Item creation');
  const { assertStorageWorkspaceContext } = await import('../storage/storageAdapter.js');
  assertStorageWorkspaceContext(captured.context.workspaceContext);
  captured.context = await prepareInventoryContext({ page, repository: PageRepository, workspaceContext: captured.context.workspaceContext });
  captured.inventory = readInventorySource(page, captured.context);
}

// Structured inventory changes only its canonical domain owner.
export async function changeInventoryItemSet(element, request) {
  const block = element?.closest?.('.item-set-block, .universal-list-block');
  if (block && !sets.has(block)) await renderInventoryItemSets(block.closest('#editorArea'));
  const current = getInventorySetState(element);
  if (!current) return false;
  if (request.type === 'quantity' && !element.closest('.inventory-runtime')) {
    element.value = element.getAttribute('value') || '';
    await refresh(element.closest('#editorArea'));
    return true;
  }
  const page = PageRepository.getPageById(current.pageId);
  if (!page || state.currentPage !== page || pending.has(page.id)) return true;
  const editor = element.closest('#editorArea');
  if (hasPendingAutosaveForPage(page.id)) {
    setStatus('Сначала дождитесь сохранения текста карточки');
    return true;
  }
  pending.add(page.id);
  try {
    if (request.type === 'quantity') {
      const text = String(request.quantity ?? '').trim();
      if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('Требуется целое количество');
      request = { ...request, quantity: Number(text),
        expectedItemBase: current.inventory.items.find(item => item.pageId === request.pageId)?.itemIdentity };
    }
    const plan = prepareInventoryChange({ pageId: page.id, expectedBase: getCurrentEditorPageBase(page.id), request, context: current.context });
    const result = await commitInventoryChange(plan);
    if (!['saved', 'unchanged'].includes(result.status)) {
      setStatus(result.status === 'uncertain' || result.written ? 'Запись инвентаря не подтверждена; не повторяйте операцию' : 'Инвентарь не сохранён: ' + result.reason);
    } else {
      if (result.written && plan.targetPageId === page.id) advanceEditorPageBase(page, page.content);
      setStatus(result.written ? 'Инвентарь сохранён' : 'Инвентарь не изменён');
    }
    await refresh(editor);
  } catch (error) {
    setStatus('Инвентарь не сохранён: ' + error.message);
    await refresh(editor);
  } finally {
    pending.delete(page.id);
  }
  return true;
}

async function refresh(editor) {
  try {
    await renderInventoryItemSets(editor);
    const { renderCharacterSheetBlocks } = await import('../editor/characterSheetBlock.js');
    await renderCharacterSheetBlocks(editor);
  } catch {
    setStatus('Обновление отображения инвентаря не подтверждено; откройте карточку заново');
  }
}
