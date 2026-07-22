import {
  closePopup,
  isPopupOpen,
  openPopupNearAnchor,
  registerPopup
} from './popupManager.js';


const CATALOGUE_BUTTON_ID =
  'componentCatalogueBtn';

const CATALOGUE_POPOVER_ID =
  'componentCataloguePopover';


export function setupComponentCatalogue({
  toolsPopup
} = {}) {

  if (
    !toolsPopup ||
    toolsPopup.querySelector(`[data-component-catalogue-open="true"]`)
  ) return;

  const trigger =
    createButton({
      label: 'Компоненты',
      icon: 'tools',
      variant: 'ghost'
    });

  trigger.id =
    CATALOGUE_BUTTON_ID;

  trigger.dataset.componentCatalogueOpen =
    'true';

  trigger.classList.add(
    'mow-tools-action'
  );

  trigger.setAttribute(
    'aria-haspopup',
    'dialog'
  );

  trigger.setAttribute(
    'aria-expanded',
    'false'
  );

  trigger.setAttribute(
    'aria-controls',
    CATALOGUE_POPOVER_ID
  );

  const popover =
    ensureCataloguePopover();

  const closeCatalogue =
    () => {

      popover.dataset.state =
        'closed';

      trigger.setAttribute(
        'aria-expanded',
        'false'
      );

      closePopup(
        popover
      );
    };

  registerPopup({
    popup:
      popover,
    close:
      closeCatalogue,
    anchors:
      [trigger]
  });

  trigger.addEventListener(
    'click',
    () => {

      if (isPopupOpen(popover)) {

        closeCatalogue();

        return;
      }

      renderCatalogue(
        popover
      );

      popover.dataset.state =
        'open';

      trigger.setAttribute(
        'aria-expanded',
        'true'
      );

      openPopupNearAnchor(
        popover,
        trigger,
        {
          fallbackWidth:
            560,
          offset:
            8
        }
      );

      requestAnimationFrame(
        () => popover
          .querySelector('[data-catalogue-autofocus="true"]')
          ?.focus()
      );
    }
  );

  toolsPopup.appendChild(
    trigger
  );
}


function ensureCataloguePopover() {

  const existing =
    document.getElementById(
      CATALOGUE_POPOVER_ID
    );

  if (existing) {

    applyCatalogueOverlayContract(
      existing
    );

    return existing;
  }

  const popover =
    document.createElement('section');

  popover.id =
    CATALOGUE_POPOVER_ID;

  popover.className =
    'mow-popover mow-component-catalogue-popover hidden';

  popover.dataset.runtime =
    'true';

  popover.dataset.state =
    'closed';

  applyCatalogueOverlayContract(
    popover
  );

  popover.setAttribute(
    'role',
    'dialog'
  );

  popover.setAttribute(
    'aria-modal',
    'false'
  );

  popover.setAttribute(
    'aria-labelledby',
    'componentCatalogueTitle'
  );

  document.body.appendChild(
    popover
  );

  return popover;
}


function applyCatalogueOverlayContract(
  popover
) {

  popover.dataset.overlayKind =
    'popover';

  popover.dataset.overlayOwner =
    'component-catalogue';

  popover.dataset.overlayLifecycle =
    'popup-manager';

  popover.dataset.overlayState =
    popover.classList.contains('hidden')
      ? 'closed'
      : 'open';
}


function renderCatalogue(
  popover
) {

  popover.replaceChildren();

  const catalogue =
    createElement(
      'div',
      'mow-component-catalogue'
    );

  const header =
    createElement(
      'header',
      'mow-component-catalogue-header'
    );

  const headingGroup =
    createElement(
      'div',
      'mow-component-catalogue-heading'
    );

  const kicker =
    createElement(
      'span',
      'mow-component-catalogue-kicker',
      'Design system'
    );

  const title =
    createElement(
      'h2',
      '',
      'Каталог компонентов'
    );

  title.id =
    'componentCatalogueTitle';

  const summary =
    createElement(
      'p',
      '',
      'Button / IconButton / Field / Toolbar / Panel / Popover'
    );

  headingGroup.append(
    kicker,
    title,
    summary
  );

  const closeButton =
    createButton({
      label: 'Закрыть',
      icon: 'x',
      variant: 'ghost'
    });

  closeButton.classList.add(
    'mow-component-catalogue-close'
  );

  closeButton.addEventListener(
    'click',
    () => {

      popover.dataset.state =
        'closed';

      document
        .getElementById(CATALOGUE_BUTTON_ID)
        ?.setAttribute(
          'aria-expanded',
          'false'
        );

      closePopup(
        popover
      );
    }
  );

  header.append(
    headingGroup,
    closeButton
  );

  catalogue.append(
    header,
    renderButtonSection(),
    renderIconButtonSection(),
    renderInputSection(),
    renderToolbarSection(),
    renderPanelSection(),
    renderPopoverSection()
  );

  popover.appendChild(
    catalogue
  );
}


function renderButtonSection() {

  const section =
    createPrimitiveSection(
      'Button',
      'Primary / secondary / ghost / danger / disabled / loading'
    );

  const row =
    createElement(
      'div',
      'mow-component-catalogue-flow'
    );

  row.append(
    createButton({
      label: 'Создать',
      icon: 'plus',
      variant: 'primary',
      autoFocus: true
    }),
    createButton({
      label: 'Сохранить',
      icon: 'copy',
      variant: 'secondary'
    }),
    createButton({
      label: 'Фильтр',
      icon: 'more',
      variant: 'ghost'
    }),
    createButton({
      label: 'Активно',
      icon: 'eye',
      variant: 'secondary',
      pressed: true
    }),
    createButton({
      label: 'Удалить',
      icon: 'trash',
      variant: 'danger'
    }),
    createButton({
      label: 'Недоступно',
      variant: 'secondary',
      disabled: true
    }),
    createButton({
      label: 'Проверка',
      variant: 'secondary',
      loading: true
    })
  );

  section.appendChild(
    row
  );

  return section;
}


function renderIconButtonSection() {

  const section =
    createPrimitiveSection(
      'IconButton',
      'Sizes / ghost / pressed / danger / disabled'
    );

  const row =
    createElement(
      'div',
      'mow-component-catalogue-flow'
    );

  row.append(
    createIconButton({
      icon: 'settings',
      label: 'Настроить',
      size: 'sm'
    }),
    createIconButton({
      icon: 'tools',
      label: 'Инструменты',
      variant: 'ghost'
    }),
    createIconButton({
      icon: 'eye',
      label: 'Показать слой',
      pressed: true
    }),
    createIconButton({
      icon: 'trash',
      label: 'Удалить',
      variant: 'danger'
    }),
    createIconButton({
      icon: 'more',
      label: 'Недоступно',
      disabled: true,
      size: 'lg'
    })
  );

  section.appendChild(
    row
  );

  return section;
}


function renderInputSection() {

  const section =
    createPrimitiveSection(
      'Field',
      'Input / select / checkbox / segmented'
    );

  const grid =
    createElement(
      'div',
      'mow-component-catalogue-grid'
    );

  grid.append(
    createField({
      label: 'Поиск',
      placeholder: 'Карты, сцены, задачи'
    }),
    createField({
      label: 'Источник',
      value: 'Локальная копия',
      readonly: true
    }),
    createField({
      label: 'Путь',
      value: 'bad / path',
      invalid: true,
      hint: 'Нужен безопасный workspace path'
    }),
    createField({
      label: 'Архив',
      value: 'Недоступно',
      disabled: true
    }),
    createSelectField({
      label: 'Режим',
      value: 'scene',
      options: [
        ['map', 'Карта'],
        ['scene', 'Сцена'],
        ['note', 'Заметка']
      ]
    }),
    createCheckboxField({
      label: 'Показывать слой',
      description: 'Короткий toggle в форме или панели.',
      checked: true
    }),
    createSegmentedControl({
      label: 'Плотность',
      value: 'normal',
      options: [
        ['compact', '80%'],
        ['normal', '100%'],
        ['large', '120%']
      ]
    })
  );

  section.appendChild(
    grid
  );

  return section;
}


function renderToolbarSection() {

  const section =
    createPrimitiveSection(
      'Toolbar',
      'Grouped actions / separator / icon-only controls'
    );

  const toolbar =
    createElement(
      'div',
      'mow-toolbar'
    );

  toolbar.setAttribute(
    'role',
    'toolbar'
  );

  toolbar.setAttribute(
    'aria-label',
    'Команды панели'
  );

  const primaryGroup =
    createElement(
      'div',
      'mow-toolbar-group'
    );

  primaryGroup.append(
    createIconButton({
      icon: 'plus',
      label: 'Добавить',
      variant: 'ghost',
      size: 'sm'
    }),
    createIconButton({
      icon: 'copy',
      label: 'Копировать',
      variant: 'ghost',
      size: 'sm'
    })
  );

  const viewGroup =
    createElement(
      'div',
      'mow-toolbar-group'
    );

  viewGroup.append(
    createIconButton({
      icon: 'eye',
      label: 'Показать',
      pressed: true,
      size: 'sm'
    }),
    createIconButton({
      icon: 'more',
      label: 'Еще',
      variant: 'ghost',
      size: 'sm'
    })
  );

  toolbar.append(
    primaryGroup,
    createElement(
      'span',
      'mow-separator'
    ),
    viewGroup
  );

  section.appendChild(
    toolbar
  );

  return section;
}


function renderPanelSection() {

  const section =
    createPrimitiveSection(
      'Panel',
      'Base / raised / sunken surfaces'
    );

  const grid =
    createElement(
      'div',
      'mow-component-catalogue-grid'
    );

  grid.append(
    createPanelSample({
      surface: 'raised',
      title: 'Рабочая панель',
      meta: 'Активная область',
      badge: 'ready'
    }),
    createPanelSample({
      surface: 'sunken',
      title: 'Список',
      meta: 'Повторяемые записи',
      badge: 'dense'
    }),
    createPanelSample({
      surface: 'embedded',
      title: 'Поле карты',
      meta: 'Вложенный блок',
      badge: 'soft'
    })
  );

  section.appendChild(
    grid
  );

  return section;
}


function renderPopoverSection() {

  const section =
    createPrimitiveSection(
      'Popover',
      'Overlay anatomy / focus / state'
    );

  const sample =
    createElement(
      'div',
      'mow-popover-sample'
    );

  sample.dataset.state =
    'open';

  const head =
    createElement(
      'div',
      'mow-popover-sample-head'
    );

  const title =
    createElement(
      'strong',
      '',
      'Быстрые действия'
    );

  const status =
    createElement(
      'span',
      'mow-badge',
      'open'
    );

  head.append(
    title,
    status
  );

  const body =
    createElement(
      'p',
      '',
      'Команды и подтверждение в одном спокойном слое.'
    );

  const actions =
    createElement(
      'div',
      'mow-component-catalogue-flow'
    );

  actions.append(
    createButton({
      label: 'Принять',
      variant: 'primary'
    }),
    createButton({
      label: 'Отмена',
      variant: 'ghost'
    })
  );

  sample.append(
    head,
    body,
    actions
  );

  section.appendChild(
    sample
  );

  return section;
}


function createPrimitiveSection(
  title,
  meta
) {

  const section =
    createElement(
      'section',
      'mow-panel mow-component-catalogue-section'
    );

  section.dataset.surface =
    'raised';

  const heading =
    createElement(
      'div',
      'mow-component-catalogue-section-head'
    );

  heading.append(
    createElement(
      'h3',
      '',
      title
    ),
    createElement(
      'span',
      '',
      meta
    )
  );

  section.appendChild(
    heading
  );

  return section;
}


function createButton({
  label,
  icon = '',
  variant = 'secondary',
  disabled = false,
  loading = false,
  pressed = false,
  autoFocus = false
}) {

  const button =
    document.createElement('button');

  button.type =
    'button';

  button.className =
    'mow-button';

  button.dataset.variant =
    variant;

  if (autoFocus) {

    button.dataset.catalogueAutofocus =
      'true';
  }

  if (disabled || loading) {

    button.disabled =
      true;
  }

  if (loading) {

    button.dataset.loading =
      'true';

    button.setAttribute(
      'aria-busy',
      'true'
    );
  }

  if (pressed) {

    button.dataset.state =
      'pressed';

    button.setAttribute(
      'aria-pressed',
      'true'
    );
  }

  if (icon) {

    appendSpriteIcon(
      button,
      icon
    );
  }

  const text =
    createElement(
      'span',
      'mow-button-label',
      label
    );

  button.appendChild(
    text
  );

  return button;
}


function createIconButton({
  icon,
  label,
  variant = 'secondary',
  disabled = false,
  pressed = false,
  size = 'md'
}) {

  const button =
    document.createElement('button');

  button.type =
    'button';

  button.className =
    'mow-icon-button';

  button.dataset.variant =
    variant;

  button.dataset.size =
    size;

  button.title =
    label;

  button.setAttribute(
    'aria-label',
    label
  );

  if (disabled) {

    button.disabled =
      true;
  }

  if (pressed) {

    button.setAttribute(
      'aria-pressed',
      'true'
    );
  }

  appendSpriteIcon(
    button,
    icon
  );

  return button;
}


function createField({
  label,
  placeholder = '',
  value = '',
  readonly = false,
  disabled = false,
  invalid = false,
  hint = ''
}) {

  const wrapper =
    createElement(
      'label',
      'mow-input-field'
    );

  const labelText =
    createElement(
      'span',
      'mow-input-label',
      label
    );

  const input =
    document.createElement('input');

  input.className =
    'mow-input';

  input.type =
    'text';

  input.placeholder =
    placeholder;

  input.value =
    value;

  input.readOnly =
    readonly;

  input.disabled =
    disabled;

  if (invalid) {

    input.setAttribute(
      'aria-invalid',
      'true'
    );
  }

  wrapper.append(
    labelText,
    input
  );

  if (hint) {

    wrapper.appendChild(
      createElement(
        'span',
        'mow-input-hint',
        hint
      )
    );
  }

  return wrapper;
}


function createSelectField({
  label,
  value,
  options
}) {

  const wrapper =
    createElement(
      'label',
      'mow-select-field'
    );

  wrapper.appendChild(
    createElement(
      'span',
      'mow-select-label',
      label
    )
  );

  const select =
    document.createElement('select');

  select.className =
    'mow-select';

  for (const [optionValue, optionLabel] of options) {

    const option =
      document.createElement('option');

    option.value =
      optionValue;

    option.textContent =
      optionLabel;

    option.selected =
      optionValue === value;

    select.appendChild(
      option
    );
  }

  wrapper.appendChild(
    select
  );

  return wrapper;
}


function createCheckboxField({
  label,
  description,
  checked = false,
  disabled = false
}) {

  const wrapper =
    createElement(
      'label',
      'mow-checkbox-field'
    );

  const checkbox =
    document.createElement('input');

  checkbox.className =
    'mow-checkbox';

  checkbox.type =
    'checkbox';

  checkbox.checked =
    checked;

  checkbox.disabled =
    disabled;

  const copy =
    createElement(
      'span',
      'mow-checkbox-copy'
    );

  copy.append(
    createElement(
      'span',
      'mow-checkbox-title',
      label
    ),
    createElement(
      'span',
      'mow-checkbox-description',
      description
    )
  );

  wrapper.append(
    checkbox,
    copy
  );

  return wrapper;
}


function createSegmentedControl({
  label,
  value,
  options
}) {

  const wrapper =
    createElement(
      'div',
      'mow-segmented-field'
    );

  wrapper.appendChild(
    createElement(
      'span',
      'mow-segmented-label',
      label
    )
  );

  const control =
    createElement(
      'div',
      'mow-segmented'
    );

  control.setAttribute(
    'role',
    'group'
  );

  control.setAttribute(
    'aria-label',
    label
  );

  for (const [optionValue, optionLabel] of options) {

    const button =
      document.createElement('button');

    button.type =
      'button';

    button.dataset.value =
      optionValue;

    button.textContent =
      optionLabel;

    const selected =
      optionValue === value;

    button.classList.toggle(
      'is-selected',
      selected
    );

    button.setAttribute(
      'aria-pressed',
      String(selected)
    );

    button.addEventListener(
      'click',
      () => {

        control
          .querySelectorAll('button')
          .forEach(item => {

            const isCurrent =
              item === button;

            item.classList.toggle(
              'is-selected',
              isCurrent
            );

            item.setAttribute(
              'aria-pressed',
              String(isCurrent)
            );
          });
      }
    );

    control.appendChild(
      button
    );
  }

  wrapper.appendChild(
    control
  );

  return wrapper;
}


function createPanelSample({
  surface,
  title,
  meta,
  badge
}) {

  const panel =
    createElement(
      'article',
      'mow-panel mow-component-catalogue-panel-sample'
    );

  panel.dataset.surface =
    surface;

  const head =
    createElement(
      'div',
      'mow-component-catalogue-panel-head'
    );

  head.append(
    createElement(
      'strong',
      '',
      title
    ),
    createElement(
      'span',
      'mow-badge',
      badge
    )
  );

  panel.append(
    head,
    createElement(
      'p',
      '',
      meta
    )
  );

  return panel;
}


function appendSpriteIcon(
  parent,
  name
) {

  const svg =
    document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );

  svg.classList.add(
    'app-icon'
  );

  svg.dataset.iconName =
    name;

  svg.dataset.iconSize =
    'sm';

  svg.setAttribute(
    'viewBox',
    '0 0 24 24'
  );

  svg.setAttribute(
    'aria-hidden',
    'true'
  );

  svg.setAttribute(
    'focusable',
    'false'
  );

  const use =
    document.createElementNS(
      'http://www.w3.org/2000/svg',
      'use'
    );

  use.setAttribute(
    'href',
    `./assets/icons/rpg-ui.svg#icon-${name}`
  );

  svg.appendChild(
    use
  );

  parent.appendChild(
    svg
  );
}


function createElement(
  tagName,
  className = '',
  text = ''
) {

  const element =
    document.createElement(
      tagName
    );

  if (className) {

    element.className =
      className;
  }

  if (text) {

    element.textContent =
      text;
  }

  return element;
}
