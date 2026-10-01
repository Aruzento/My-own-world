import * as PageRepository from '../../repository/pageRepository.js';
import { state } from '../../state.js';
import { arePageStateIdentitiesEqual } from '../../core/pageRecord.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext, hasWorkspaceAccess } from '../../storage/storageAdapter.js';
import { saveAssetFile } from '../../storage/assetStorage.js';
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
  updateInspectorBindingDraft,
  validateInspectorDraft
} from './inspectorModel.js';
import { renderInspectorField } from './fieldComponentRegistry.js';
import { referenceFieldMatchesPage } from '../../cardTypes/cardReferenceTargets.js';
import { canEditEntityBinding } from '../../variables/entityBindings.js';
import { renderMigrationSettings } from '../settings/migrationSettings.js';
import { openPage } from '../../editor/editor.js';
import { hasStructuredPageData } from '../../storage/structuredPagePolicy.js';
import { renderTree } from '../../tree/tree.js';

let active = null;
let renderRevision = 0;

export async function renderUniversalCardInspector(page, options = {}) {
  const revision = ++renderRevision;
  const workspaceContext = options.workspaceContext || (hasWorkspaceAccess() ? captureStorageWorkspaceContext() : null);
  const repository = options.repository || PageRepository;
  const previousVisibility = active?.pageId === page?.id
    ? active.panelVisibility
    : 'visible';
  let registry = options.registry;
  let loadError = null;
  if (!registry && hasStructuredPageData(page)) {
    try {
      const { catalog } = await readCardTypeCatalog();
      registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
    } catch (error) {
      loadError = error;
    }
  }
  if (revision !== renderRevision || state.currentPage?.id !== page?.id && !options.allowDetached) return false;
  if (workspaceContext) try { assertStorageWorkspaceContext(workspaceContext); } catch { return false; }
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
    workspaceContext,
    saveState: null,
    sectionId: null,
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
  const migration = document.createElement('button');
  migration.type = 'button'; migration.textContent = 'Миграция и восстановление';
  migration.addEventListener('click', () => void showCardMigration());
  header.append(migration);
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
  if (active.snapshot.mode === 'legacy') {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Мигрировать карточку';
    button.addEventListener('click', () => void showCardMigration()); container.append(button);
  }
  return container;
}

async function showCardMigration() {
  const pageId = active.pageId;
  const host = document.createElement('div'); host.className = 'card-inspector card-inspector__state';
  showAppRightPanel({ content: host, label: 'Миграция карточки' });
  await renderMigrationSettings(host, { pageId });
}

function renderStructured() {
  const form = document.createElement('form');
  form.className = 'card-inspector__form';
  form.noValidate = true;
  const snapshot = projectDraftSnapshot(active.draft);
  const validation = validateInspectorDraft(active.draft);
  const valueContext = { resolvers: active.resolvers, repository: active.repository, registry: active.registry };
  const sections = buildInspectorSections(snapshot.definition, key => readDraftValue(active.draft, key, 'effective', valueContext));
  active.sections = sections;
  active.valueContext = valueContext;
  if (!sections.some(section => section.id === active.sectionId)) active.sectionId = sections[0]?.id;
  valueContext.referencePages = null;
  if (sections.length > 1) form.append(renderTabs(sections, validation));
  for (const section of sections.filter(section => section.id === active.sectionId)) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'card-inspector__section';
    fieldset.disabled = !active.workspaceContext || active.saveState?.status === 'saving';
    fieldset.id = `inspector-section-${section.id}`;
    fieldset.dataset.sectionId = section.id;
    if (sections.length > 1) { fieldset.setAttribute('role', 'tabpanel'); fieldset.setAttribute('aria-labelledby', `inspector-tab-${section.id}`); }
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

function renderTabs(sections, validation) {
  const tabs = document.createElement('div'); tabs.className = 'card-inspector__tabs';
  tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Разделы карточки');
  for (const section of sections) {
    const tab = document.createElement('button'); tab.type = 'button'; tab.id = `inspector-tab-${section.id}`;
    tab.setAttribute('role', 'tab'); tab.dataset.sectionId = section.id;
    tab.setAttribute('aria-controls', `inspector-section-${section.id}`);
    tab.setAttribute('aria-selected', String(section.id === active.sectionId));
    tab.tabIndex = section.id === active.sectionId ? 0 : -1;
    setTabLabel(tab, section, validation.issues);
    tab.addEventListener('click', () => selectSection(section.id));
    tab.addEventListener('keydown', event => {
      const index = sections.indexOf(section);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 :
        event.key === 'ArrowRight' ? (index + 1) % sections.length : event.key === 'ArrowLeft' ? (index - 1 + sections.length) % sections.length : null;
      if (next === null) return;
      event.preventDefault(); selectSection(sections[next].id);
    });
    tabs.append(tab);
  }
  return tabs;
}

function selectSection(id) {
  if (!active || active.sectionId === id) return;
  active.sectionId = id; paint();
  const tab = document.getElementById(`inspector-tab-${id}`);
  tab?.focus({ preventScroll: true });
  tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function setTabLabel(tab, section, issues) {
  const errors = issues.filter(issue => issue.severity === 'error' && section.fields.some(field =>
    issue.details?.key === field.key || issue.details?.key?.startsWith(`${field.key}.`) || issue.details?.path?.includes(field.key)));
  tab.textContent = `${section.label}${errors.length ? ' ⚠' : ''}`;
  tab.dataset.hasErrors = String(errors.length > 0);
  tab.setAttribute('aria-label', `${section.label}${errors.length ? `: ошибок ${errors.length}` : ''}`);
}

function fieldContext(field, issues, valueContext) {
  const session = active;
  return {
    issues,
    rawInputs: active.draft.rawInputs,
    canEditBinding: definition => canEditEntityBinding(definition) &&
      !['invalid', 'unresolved', 'unsupported'].includes(readDraftValue(active.draft, definition.key, 'effective', valueContext).status),
    getValue: key => readDraftValue(active.draft, key, 'effective', valueContext),
    referencePages: definition => (valueContext.referencePages ||= active.repository.getAllPages()).filter(page => {
      if (!definition.targetTypes?.length) return true;
      return referenceFieldMatchesPage(definition, page);
    }),
    referencePageById: pageId => active.repository.getPageById(pageId),
    isCurrent: () => active === session,
    importAsset: async file => {
      assertStorageWorkspaceContext(session.workspaceContext);
      if (active !== session) return null;
      const asset = await saveAssetFile(file, { filename: `${crypto.randomUUID()}-${file.name}`, resolveUrl: false });
      assertStorageWorkspaceContext(session.workspaceContext);
      return active === session ? { kind: 'asset', path: `assets/${asset.path.replace(/^assets\//, '')}` } : null;
    },
    onValue: (definition, value, { inputKey = definition.key, operation = 'set' } = {}) =>
      changeDraft((definition.binding.owner === 'variables' ? updateInspectorDraft : updateInspectorBindingDraft)(active.draft, { op: operation, key: definition.key, value }, { inputKey }), definition.key),
    onUnset: (definition, { inputKey = definition.key } = {}) =>
      changeDraft((definition.binding.owner === 'variables' ? updateInspectorDraft : updateInspectorBindingDraft)(active.draft, { op: 'unset', key: definition.key }, { inputKey }), definition.key),
    onResetOverride: (definition, inputKey = definition.key) =>
      changeDraft(updateInspectorDraft(active.draft, { op: 'resetOverride', key: definition.key }, { inputKey }), definition.key),
    onRawIssue: (key, raw, message) => changeDraft(setInspectorDraftInputIssue(active.draft, key, raw, message), field.key)
  };
}

function changeDraft(next, rootKey) {
  active.draft = next;
  active.saveState = null;
  const form = document.querySelector('.card-inspector__form');
  if (!form) return;
  const validation = validateInspectorDraft(next);
  active.valueContext.referencePages = null;
  const currentSections = buildInspectorSections(projectDraftSnapshot(next).definition,
    key => readDraftValue(next, key, 'effective', active.valueContext));
  if (JSON.stringify(currentSections.map(section => [section.id, section.fields.map(field => field.key)])) !==
      JSON.stringify(active.sections.map(section => [section.id, section.fields.map(field => field.key)]))) { paint(); return; }
  // Keep the tabs/form and their focus stable; update the edited root and its
  // visible computed projections. Inactive sections are rendered only on demand.
  const section = active.sections.find(section => section.id === active.sectionId);
  for (const field of section?.fields || []) if (field.key === rootKey || field.computed) {
    const node = [...form.querySelectorAll('[data-field-key]')].find(node => node.dataset.fieldKey === field.key);
    node?.replaceWith(renderInspectorField(field, fieldContext(field, validation.issues, active.valueContext)));
  }
  for (const tab of form.querySelectorAll('[role="tab"]')) setTabLabel(tab, active.sections.find(section => section.id === tab.dataset.sectionId), validation.issues);
  form.querySelector('.card-inspector__save')?.replaceWith(renderSaveArea(validation));
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
  button.disabled = !active.workspaceContext || !active.draft.dirty || !validation.ok || active.saveState?.status === 'saving';
  if (!validation.ok) button.title = 'Исправьте отмеченные значения перед сохранением';
  footer.append(status, button);
  return footer;
}

async function saveDraft() {
  if (active.saveState?.status === 'saving') return;
  const session = active;
  const validation = validateInspectorDraft(active.draft);
  if (!validation.ok) {
    active.saveState = { status: 'validation', message: 'Исправьте ошибки полей. Введённые значения сохранены в draft.' };
    paint();
    return;
  }
  if (!active.draft.patch.length && !active.draft.bindingsPatch.length) return;
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
      bindingsPatch: active.draft.bindingsPatch,
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
  if (active !== session) return; // Navigation cannot publish into another card.
  if (!['saved', 'unchanged'].includes(result.status)) {
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
  if (active.draft.bindingsPatch.some(operation => active.snapshot.definition.fieldsByKey[operation.key].binding.owner === 'page')) renderTree();
  // A content binding changed the body through its canonical owner. Reopen from
  // durable PageRecord before body autosave can serialize an older portrait slot.
  if (active.draft.bindingsPatch.some(operation => active.snapshot.definition.fieldsByKey[operation.key].binding.owner === 'content')) {
    await openPage(page);
    if (active?.pageId !== page.id) return;
  }
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
