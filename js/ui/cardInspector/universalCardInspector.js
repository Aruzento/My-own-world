import * as PageRepository from '../../repository/pageRepository.js';
import { state } from '../../state.js';
import { arePageStateIdentitiesEqual } from '../../core/pageRecord.js';
import { captureStorageWorkspaceContext } from '../../storage/storageAdapter.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../../storage/cardTypeCatalogStorage.js';
import { readEntity, prepareVariablesChange, commitVariablesChange } from '../../variables/entityVariables.js';
import { advanceEditorPageBase, getCurrentEditorPageBase } from '../../editor/editorSessionBase.js';
import { hasPendingAutosaveForPage } from '../../editor/autosave.js';
import { showAppRightPanel, hideAppRightPanel } from '../appShell.js';
import {
  buildInspectorSections,
  createInspectorDraft,
  describeInspectorSource,
  issueMessage,
  projectDraftSnapshot,
  readDraftValue,
  setInspectorDraftInputIssue,
  updateInspectorDraft,
  validateInspectorDraft
} from './inspectorModel.js';
import { renderInspectorField } from './fieldComponentRegistry.js';
import { referenceFieldMatchesPage } from '../../cardTypes/cardReferenceTargets.js';

let active = null;

export async function renderUniversalCardInspector(page, options = {}) {
  const repository = options.repository || PageRepository;
  const previousVisibility = active?.pageId === page?.id
    ? active.panelVisibility
    : 'visible';
  let registry = options.registry;
  let loadError = null;
  if (!registry) {
    try {
      const { catalog } = await readCardTypeCatalog();
      registry = createCardTypeRegistryFromCatalog(catalog);
    } catch (error) {
      loadError = error;
    }
  }
  if (state.currentPage?.id !== page?.id && !options.allowDetached) return false;
  const snapshot = loadError
    ? { mode: 'missing-definition', pageId: page?.id || null, diagnostics: [{ code: 'catalog.read_failed', message: String(loadError.message || loadError), severity: 'error' }] }
    : readEntity(page?.id, { repository, registry });
  active = {
    pageId: page?.id || null,
    snapshot,
    draft: snapshot.mode === 'structured' ? createInspectorDraft(snapshot) : null,
    registry,
    repository,
    resolvers: options.resolvers,
    editor: options.editor || document.getElementById('editor'),
    workspaceContext: options.workspaceContext,
    saveState: null,
    allowDetached: Boolean(options.allowDetached),
    panelVisibility: previousVisibility
  };
  ensureInspectorToggle();
  paint();
  return true;
}

export function hideUniversalCardInspector() {
  active = null;
  syncInspectorToggle();
  hideAppRightPanel();
}

export function toggleUniversalCardInspectorPanel() {
  if (!active) return false;
  active.panelVisibility = active.panelVisibility === 'visible'
    ? 'hidden'
    : 'visible';
  if (active.panelVisibility === 'hidden') {
    hideAppRightPanel();
    syncInspectorToggle();
    return true;
  }
  paint();
  return true;
}

export function getUniversalCardInspectorState() {
  return active;
}

function paint() {
  if (!active) return;
  const panel = document.createElement('div');
  panel.className = 'card-inspector';
  panel.dataset.sourceMode = active.snapshot.mode;
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = 'Inspector';
  header.append(title);
  panel.append(header);
  const source = describeInspectorSource(active.snapshot);
  if (!source.editable) panel.append(renderUnavailable(source));
  else panel.append(renderStructured());
  if (active.panelVisibility !== 'visible') {
    syncInspectorToggle();
    return;
  }
  showAppRightPanel({ content: panel, label: 'Inspector карточки' });
  syncInspectorToggle();
}

function ensureInspectorToggle() {
  const toggle = document.getElementById('appInspectorToggleBtn');
  if (!toggle || toggle.dataset.cardInspectorBound === 'true') return;
  toggle.dataset.cardInspectorBound = 'true';
  toggle.addEventListener('click', () => {
    toggleUniversalCardInspectorPanel();
  });
}

function syncInspectorToggle() {
  const toggle = document.getElementById('appInspectorToggleBtn');
  if (!toggle) return;
  const isAvailable = Boolean(active);
  const isVisible = active?.panelVisibility === 'visible';
  toggle.classList.toggle('hidden', !isAvailable);
  toggle.disabled = !isAvailable;
  toggle.setAttribute('aria-expanded', String(isVisible));
  toggle.setAttribute('aria-label', isVisible ? 'Скрыть Inspector' : 'Показать Inspector');
  toggle.setAttribute('title', isVisible ? 'Скрыть Inspector' : 'Показать Inspector');
  toggle.dataset.tooltip = isVisible ? 'Скрыть Inspector' : 'Показать Inspector';
  const icon = toggle.querySelector('use');
  icon?.setAttribute('href', `./assets/icons/rpg-ui.svg#icon-${isVisible ? 'eye-off' : 'eye'}`);
}

function renderUnavailable(source) {
  const container = document.createElement('section');
  container.className = 'card-inspector__state';
  const title = document.createElement('h3');
  title.textContent = source.title;
  const message = document.createElement('p');
  message.textContent = source.message;
  container.append(title, message, renderDiagnostics(active.snapshot.diagnostics));
  return container;
}

function renderStructured() {
  const form = document.createElement('form');
  form.className = 'card-inspector__form';
  form.noValidate = true;
  const snapshot = projectDraftSnapshot(active.draft);
  const validation = validateInspectorDraft(active.draft);
  const valueContext = { resolvers: active.resolvers, repository: active.repository, registry: active.registry };
  const sections = buildInspectorSections(snapshot.definition, key => readDraftValue(active.draft, key, 'effective', valueContext));
  for (const section of sections) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'card-inspector__section';
    const legend = document.createElement('legend');
    legend.textContent = section.label;
    fieldset.append(legend);
    const groups = new Map();
    for (const field of section.fields) {
      let owner = fieldset;
      if (field.group) {
        if (!groups.has(field.group)) {
          const group = document.createElement('fieldset');
          group.className = 'card-inspector__nested card-inspector__group';
          const groupLabel = document.createElement('legend');
          groupLabel.textContent = field.group;
          group.append(groupLabel);
          groups.set(field.group, group);
          fieldset.append(group);
        }
        owner = groups.get(field.group);
      }
      owner.append(renderInspectorField(field, fieldContext(field, validation.issues, valueContext)));
    }
    form.append(fieldset);
  }
  if (!sections.length) {
    const empty = document.createElement('p');
    empty.textContent = 'В этой schema нет отображаемых полей.';
    form.append(empty);
  }
  form.append(renderSaveArea(validation));
  form.addEventListener('submit', event => {
    event.preventDefault();
    void saveDraft();
  });
  return form;
}

function fieldContext(field, issues, valueContext) {
  return {
    issues,
    rawInputs: active.draft.rawInputs,
    getValue: key => readDraftValue(active.draft, key, 'effective', valueContext),
    referencePages: definition => active.repository.getAllPages().filter(page => {
      if (!definition.targetTypes?.length) return true;
      return referenceFieldMatchesPage(definition, page);
    }),
    onValue: (definition, value, { inputKey = definition.key, operation = 'set' } = {}) =>
      changeDraft(updateInspectorDraft(active.draft, { op: operation, key: definition.key, value }, { inputKey })),
    onUnset: (definition, { inputKey = definition.key } = {}) =>
      changeDraft(updateInspectorDraft(active.draft, { op: 'unset', key: definition.key }, { inputKey })),
    onResetOverride: (definition, inputKey = definition.key) =>
      changeDraft(updateInspectorDraft(active.draft, { op: 'resetOverride', key: definition.key }, { inputKey })),
    onRawIssue: (key, raw, message) => changeDraft(setInspectorDraftInputIssue(active.draft, key, raw, message))
  };
}

function changeDraft(next) {
  active.draft = next;
  active.saveState = null;
  paint();
}

function renderSaveArea(validation) {
  const footer = document.createElement('footer');
  footer.className = 'card-inspector__save';
  const status = document.createElement('div');
  status.className = 'card-inspector__save-status';
  status.setAttribute('role', 'status');
  status.textContent = saveMessage(active.saveState);
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Сохранить поля';
  button.disabled = !active.draft.dirty || !validation.ok;
  if (!validation.ok) button.title = 'Исправьте отмеченные значения перед сохранением';
  footer.append(status, button);
  return footer;
}

async function saveDraft() {
  const validation = validateInspectorDraft(active.draft);
  if (!validation.ok) {
    active.saveState = { status: 'validation', message: 'Исправьте ошибки полей. Введённые значения сохранены в draft.' };
    paint();
    return;
  }
  if (!active.draft.patch.length) return;
  const editorBase = getCurrentEditorPageBase(active.pageId);
  if (hasPendingAutosaveForPage(active.pageId) || !arePageStateIdentitiesEqual(editorBase, active.draft.sourceIdentity)) {
    active.saveState = { status: 'stale', message: 'Текст карточки изменён. Сначала сохраните или перезагрузите карточку; draft Inspector сохранён.' };
    paint();
    return;
  }
  let plan;
  try {
    plan = prepareVariablesChange({
      pageId: active.pageId,
      expectedBase: active.draft.sourceIdentity,
      patch: active.draft.patch,
      context: {
        registry: active.registry,
        repository: active.repository,
        workspaceContext: active.workspaceContext || captureStorageWorkspaceContext()
      }
    });
  } catch (error) {
    active.saveState = classifyError(error);
    paint();
    return;
  }
  active.saveState = { status: 'saving', message: 'Сохранение…' };
  paint();
  const result = await commitVariablesChange(plan);
  if (result.status !== 'saved') {
    active.saveState = {
      status: result.status || 'blocked',
      message: result.status === 'uncertain'
        ? 'Запись могла завершиться, но readback не подтверждён. Перезагрузите карточку перед повтором.'
        : `Сохранение заблокировано: ${result.reason || result.writeStatus || 'page/schema/workspace changed'}. Draft сохранён.`
    };
    paint();
    return;
  }
  const page = active.repository.getPageById(active.pageId);
  const snapshot = readEntity(active.pageId, { repository: active.repository, registry: active.registry });
  advanceEditorPageBase(page, page.content);
  active.snapshot = snapshot;
  active.draft = createInspectorDraft(snapshot);
  active.saveState = { status: 'saved', message: 'Поля сохранены и проверены чтением.' };
  paint();
}

function classifyError(error) {
  const message = String(error.message || error);
  if (error.issues) return { status: 'validation', message: 'Изменения не прошли schema validation. Draft сохранён.' };
  if (/workspace/i.test(message)) return { status: 'workspace', message: 'Рабочее пространство изменилось. Draft сохранён.' };
  if (/schema|catalog|definition/i.test(message)) return { status: 'schema', message: 'Schema/catalog изменились. Перезагрузите карточку; draft сохранён.' };
  if (/stale|base/i.test(message)) return { status: 'stale', message: 'Карточка изменилась после открытия. Draft сохранён.' };
  return { status: 'blocked', message: `Сохранение заблокировано: ${message}. Draft сохранён.` };
}

function renderDiagnostics(diagnostics = []) {
  const list = document.createElement('ul');
  list.className = 'card-inspector__diagnostics';
  diagnostics.forEach(issue => {
    const item = document.createElement('li');
    item.textContent = issueMessage(issue);
    list.append(item);
  });
  return list;
}

function saveMessage(state) {
  if (state?.message) return state.message;
  if (active.draft.dirty) return 'Есть несохранённые изменения Inspector.';
  return 'Изменений нет.';
}
