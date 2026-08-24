import {
  registerPopup,
  togglePopupNearAnchor,
  closePopup
} from '../popupManager.js';

import {
  iconSvg
} from '../../core/icons.js';

import {
  renderAssetHealthPanel
} from '../assetHealthPanel.js';

import {
  renderWorkspaceDiagnosticsPanel
} from '../workspaceDiagnosticsPanel.js';

import {
  DEFAULT_SETTINGS_SECTION_ID,
  SETTINGS_GROUPS,
  getSettingsSection,
  getSettingsSectionsByGroup,
  searchSettingsSections
} from './settingsRegistry.js';

import {
  renderAppearanceSettings,
  renderFutureSettings
} from './settingsSections.js';

import {
  renderBackupSettings
} from './backupSettings.js';

import {
  applySettingsTooltip
} from './settingsTooltip.js';


const SETTINGS_CENTER_VERSION =
  'settings-center';


export function setupSettingsCenter({
  settingsButton,
  settingsPopup,
  settingsCloseButton,
  beforeOpen
}) {

  if (!settingsButton || !settingsPopup) return null;

  const controller =
    createSettingsCenterController({
      popup:
        settingsPopup,
      closeButton:
        settingsCloseButton
    });

  const closeSettings =
    () => {

      settingsButton.setAttribute(
        'aria-expanded',
        'false'
      );

      closePopup(
        settingsPopup
      );
    };

  registerPopup({
    popup:
      settingsPopup,
    close:
      closeSettings,
    anchors:
      [settingsButton],
    key:
      'app-settings-center',
    kind:
      'dialog'
  });

  settingsButton.addEventListener(
    'click',
    async () => {

      beforeOpen?.();

      const shouldOpen =
        settingsPopup.classList.contains(
          'hidden'
        );

      if (shouldOpen) {

        await controller.prepareOpen();
      }

      const opened =
        togglePopupNearAnchor(
          settingsPopup,
          settingsButton,
          {
            fallbackWidth:
              960,
            offset:
              8
          }
        );

      settingsButton.setAttribute(
        'aria-expanded',
        String(opened)
      );

      if (opened) {

        controller.focusInitial();
      }
    }
  );

  settingsCloseButton?.addEventListener(
    'click',
    closeSettings
  );

  return closeSettings;
}


function createSettingsCenterController({
  popup,
  closeButton
}) {

  let shell =
    null;

  let searchInput =
    null;

  let sidebar =
    null;

  let content =
    null;

  let activeSectionId =
    DEFAULT_SETTINGS_SECTION_ID;

  const sectionCache =
    new Map();

  const ensureChrome =
    () => {

      if (shell) return;

      popup.setAttribute(
        'data-settings-ui-migration',
        SETTINGS_CENTER_VERSION
      );

      popup.setAttribute(
        'aria-labelledby',
        'appSettingsCenterTitle'
      );

      popup
        .querySelector('.app-settings-chrome')
        ?.remove();

      shell =
        document.createElement('div');

      shell.className =
        'app-settings-shell';

      const header =
        createSettingsHeader({
          closeButton,
          onSearch:
            value => renderSearch(
              value
            )
        });

      searchInput =
        header.querySelector('[data-settings-search-input]');

      const layout =
        document.createElement('div');

      layout.className =
        'app-settings-layout';

      sidebar =
        createSettingsSidebar({
          activeSectionId,
          onSelect:
            sectionId => selectSection(
              sectionId,
              {
                clearSearch:
                  true,
                focusContent:
                  true
              }
            )
        });

      content =
        document.createElement('div');

      content.className =
        'app-settings-content';

      content.tabIndex =
        -1;

      content.setAttribute(
        'aria-live',
        'polite'
      );

      layout.append(
        sidebar,
        content
      );

      shell.append(
        header,
        layout
      );

      popup.appendChild(
        shell
      );
    };

  const prepareOpen =
    async () => {

      ensureChrome();

      if (searchInput) {

        searchInput.value =
          '';
      }

      popup.dataset.settingsSearch =
        'idle';

      await selectSection(
        activeSectionId,
        {
          clearSearch:
            false
        }
      );
    };

  const selectSection =
    async (
      sectionId,
      options = {}
    ) => {

      ensureChrome();

      const section =
        getSettingsSection(
          sectionId
        ) ||
        getSettingsSection(
          DEFAULT_SETTINGS_SECTION_ID
        );

      if (!section || !content) return;

      activeSectionId =
        section.id;

      if (
        options.clearSearch !== false &&
        searchInput
      ) {

        searchInput.value =
          '';

        popup.dataset.settingsSearch =
          'idle';
      }

      updateSidebarActiveState(
        sidebar,
        activeSectionId
      );

      const page =
        await getOrCreateSectionPage(
          section
        );

      content.replaceChildren(
        page
      );

      if (options.focusContent) {

        content.focus({
          preventScroll:
            true
        });
      }
    };

  const getOrCreateSectionPage =
    async section => {

      if (sectionCache.has(section.id)) {

        return sectionCache.get(section.id);
      }

      const page =
        createSettingsPage(section);

      const body =
        page.querySelector('[data-settings-page-body]');

      await renderSectionBody(
        section,
        body
      );

      sectionCache.set(
        section.id,
        page
      );

      return page;
    };

  const renderSearch =
    query => {

      ensureChrome();

      if (!content) return;

      const results =
        searchSettingsSections(
          query
        );

      if (!String(query || '').trim()) {

        popup.dataset.settingsSearch =
          'idle';

        selectSection(
          activeSectionId,
          {
            clearSearch:
              false
          }
        );

        return;
      }

      popup.dataset.settingsSearch =
        'active';

      content.replaceChildren(
        createSearchResultsPage({
          query,
          results,
          onOpen:
            sectionId => selectSection(
              sectionId,
              {
                clearSearch:
                  true,
                focusContent:
                  true
              }
            )
        })
      );
    };

  const focusInitial =
    () => {

      ensureChrome();

      searchInput?.focus({
        preventScroll:
          true
      });
    };

  return {
    prepareOpen,
    focusInitial
  };
}


function createSettingsHeader({
  closeButton,
  onSearch
}) {

  const header =
    document.createElement('div');

  header.className =
    'app-settings-header';

  const titleWrap =
    document.createElement('div');

  titleWrap.className =
    'app-settings-title-wrap';

  const icon =
    document.createElement('span');

  icon.className =
    'app-settings-header-mark';

  icon.innerHTML =
    iconSvg(
      'settings',
      'app-settings-header-icon'
    );

  const titleCopy =
    document.createElement('div');

  titleCopy.className =
    'app-settings-header-text';

  const kicker =
    document.createElement('span');

  kicker.className =
    'app-settings-kicker';

  kicker.textContent =
    'Система';

  const title =
    document.createElement('h2');

  title.id =
    'appSettingsCenterTitle';

  title.textContent =
    'Настройки';

  titleCopy.append(
    kicker,
    title
  );

  titleWrap.append(
    icon,
    titleCopy
  );

  const actions =
    document.createElement('div');

  actions.className =
    'app-settings-header-actions';

  const label =
    document.createElement('label');

  label.className =
    'app-settings-search-label';

  const hidden =
    document.createElement('span');

  hidden.className =
    'app-settings-visually-hidden';

  hidden.textContent =
    'Поиск по настройкам';

  const search =
    document.createElement('input');

  search.type =
    'search';

  search.className =
    'app-settings-search';

  search.placeholder =
    'Поиск настроек';

  search.autocomplete =
    'off';

  search.dataset.settingsSearchInput =
    'true';

  search.setAttribute(
    'aria-label',
    'Поиск по настройкам'
  );

  search.addEventListener(
    'input',
    () => onSearch?.(
      search.value
    )
  );

  label.append(
    hidden,
    search
  );

  actions.appendChild(
    label
  );

  if (closeButton) {

    closeButton.classList.add(
      'app-settings-close'
    );

    closeButton.removeAttribute(
      'title'
    );

    closeButton.setAttribute(
      'aria-label',
      'Закрыть настройки'
    );

    applySettingsTooltip(
      closeButton,
      'Закрыть настройки',
      {
        placement:
          'left'
      }
    );

    actions.appendChild(
      closeButton
    );
  }

  header.append(
    titleWrap,
    actions
  );

  return header;
}


function createSettingsSidebar({
  activeSectionId,
  onSelect
}) {

  const nav =
    document.createElement('nav');

  nav.className =
    'app-settings-sidebar';

  nav.setAttribute(
    'aria-label',
    'Разделы настроек'
  );

  for (const group of SETTINGS_GROUPS) {

    const groupNode =
      document.createElement('section');

    groupNode.className =
      'app-settings-sidebar-group';

    const heading =
      document.createElement('div');

    heading.className =
      'app-settings-sidebar-heading';

    heading.textContent =
      group.title;

    groupNode.appendChild(
      heading
    );

    for (const section of getSettingsSectionsByGroup(group.id)) {

      groupNode.appendChild(
        createSidebarButton({
          section,
          isActive:
            section.id === activeSectionId,
          onSelect
        })
      );
    }

    nav.appendChild(
      groupNode
    );
  }

  nav.addEventListener(
    'keydown',
    event => {

      if (
        event.key !== 'ArrowDown' &&
        event.key !== 'ArrowUp'
      ) return;

      const buttons =
        [
          ...nav.querySelectorAll('[data-settings-category]')
        ];

      const index =
        buttons.indexOf(
          document.activeElement
        );

      if (index < 0) return;

      event.preventDefault();

      const nextIndex =
        event.key === 'ArrowDown'
          ? Math.min(index + 1, buttons.length - 1)
          : Math.max(index - 1, 0);

      buttons[nextIndex]?.focus();
    }
  );

  return nav;
}


function createSidebarButton({
  section,
  isActive,
  onSelect
}) {

  const button =
    document.createElement('button');

  button.type =
    'button';

  button.className =
    'app-settings-sidebar-item';

  button.dataset.settingsCategory =
    section.id;

  if (isActive) {

    button.classList.add(
      'is-active'
    );

    button.setAttribute(
      'aria-current',
      'page'
    );
  }

  const icon =
    document.createElement('span');

  icon.className =
    'app-settings-sidebar-icon';

  icon.innerHTML =
    iconSvg(
      section.icon,
      'app-settings-sidebar-icon-svg'
    );

  const label =
    document.createElement('span');

  label.className =
    'app-settings-sidebar-label';

  label.textContent =
    section.title;

  button.append(
    icon,
    label
  );

  applySettingsTooltip(
    button,
    section.description,
    {
      placement:
        'right'
    }
  );

  button.addEventListener(
    'click',
    () => onSelect?.(
      section.id
    )
  );

  return button;
}


function updateSidebarActiveState(
  sidebar,
  activeSectionId
) {

  sidebar
    ?.querySelectorAll('[data-settings-category]')
    .forEach(button => {

      const isActive =
        button.dataset.settingsCategory === activeSectionId;

      button.classList.toggle(
        'is-active',
        isActive
      );

      if (isActive) {

        button.setAttribute(
          'aria-current',
          'page'
        );

      } else {

        button.removeAttribute(
          'aria-current'
        );
      }
    });
}


function createSettingsPage(
  section
) {

  const page =
    document.createElement('section');

  page.className =
    'app-settings-page';

  page.dataset.settingsPage =
    section.id;

  const titleId =
    `app-settings-page-title-${section.id}`;

  page.setAttribute(
    'role',
    'region'
  );

  page.setAttribute(
    'aria-labelledby',
    titleId
  );

  const header =
    document.createElement('header');

  header.className =
    'app-settings-page-header';

  const mark =
    document.createElement('span');

  mark.className =
    'app-settings-page-icon';

  mark.innerHTML =
    iconSvg(
      section.icon,
      'app-settings-page-icon-svg'
    );

  const copy =
    document.createElement('div');

  copy.className =
    'app-settings-page-copy';

  const title =
    document.createElement('h3');

  title.id =
    titleId;

  title.textContent =
    section.title;

  const description =
    document.createElement('p');

  description.textContent =
    section.description;

  copy.append(
    title,
    description
  );

  header.append(
    mark,
    copy
  );

  const body =
    document.createElement('div');

  body.className =
    'app-settings-section-content';

  body.dataset.settingsPageBody =
    section.id;

  page.append(
    header,
    body
  );

  return page;
}


async function renderSectionBody(
  section,
  body
) {

  switch (section.renderer) {

    case 'appearance':
      renderAppearanceSettings(
        body
      );
      break;

    case 'backup':
      await renderBackupSettings(
        body,
        {
          showHeader:
            false
        }
      );
      break;

    case 'storage':
      await renderAssetHealthPanel(
        body
      );
      break;

    case 'diagnostics':
      await renderWorkspaceDiagnosticsPanel(
        body
      );
      break;

    default:
      renderFutureSettings(
        body,
        section
      );
      break;
  }
}


function createSearchResultsPage({
  query,
  results,
  onOpen
}) {

  const page =
    document.createElement('section');

  page.className =
    'app-settings-page app-settings-search-results';

  page.dataset.settingsPage =
    'search';

  const header =
    document.createElement('header');

  header.className =
    'app-settings-page-header';

  const mark =
    document.createElement('span');

  mark.className =
    'app-settings-page-icon';

  mark.innerHTML =
    iconSvg(
      'search',
      'app-settings-page-icon-svg'
    );

  const copy =
    document.createElement('div');

  copy.className =
    'app-settings-page-copy';

  const title =
    document.createElement('h3');

  title.textContent =
    'Поиск настроек';

  const description =
    document.createElement('p');

  description.textContent =
    results.length
      ? `Найдено разделов: ${results.length}.`
      : `По запросу «${query}» ничего не найдено.`;

  copy.append(
    title,
    description
  );

  header.append(
    mark,
    copy
  );

  const list =
    document.createElement('div');

  list.className =
    'app-settings-search-list';

  if (!results.length) {

    const empty =
      document.createElement('p');

    empty.className =
      'app-settings-search-empty';

    empty.textContent =
      'Попробуйте другое слово: например, резерв, карта, цвет или диагностика.';

    list.appendChild(
      empty
    );

  } else {

    for (const result of results) {

      const button =
        document.createElement('button');

      button.type =
        'button';

      button.className =
        'app-settings-search-result';

      button.dataset.settingsSearchResult =
        result.section.id;

      const icon =
        document.createElement('span');

      icon.className =
        'app-settings-search-result-icon';

      icon.innerHTML =
        iconSvg(
          result.section.icon,
          'app-settings-search-result-icon-svg'
        );

      const copyNode =
        document.createElement('span');

      copyNode.className =
        'app-settings-search-result-copy';

      const label =
        document.createElement('strong');

      label.textContent =
        result.section.title;

      const match =
        document.createElement('span');

      match.textContent =
        result.match === result.section.title
          ? result.section.description
          : `Совпадение: ${result.match}`;

      copyNode.append(
        label,
        match
      );

      button.append(
        icon,
        copyNode
      );

      button.addEventListener(
        'click',
        () => onOpen?.(
          result.section.id
        )
      );

      list.appendChild(
        button
      );
    }
  }

  page.append(
    header,
    list
  );

  return page;
}
