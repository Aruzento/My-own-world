import {
  iconSvg
} from '../../core/icons.js';

import {
  getStoredAppearance,
  updateStoredAppearance
} from '../themeManager.js';

import {
  applySettingsTooltip
} from './settingsTooltip.js';


const APPEARANCE_OPTIONS = Object.freeze({
  theme: Object.freeze([
    ['dark', 'Тёмная'],
    ['contrast', 'Контрастная']
  ]),
  accent: Object.freeze([
    ['gold', 'Золото'],
    ['blue', 'Синий'],
    ['green', 'Лес'],
    ['purple', 'Аркана'],
    ['red', 'Кровь']
  ]),
  background: Object.freeze([
    ['stone', 'Камень'],
    ['forest', 'Лес'],
    ['arcane', 'Магия']
  ]),
  scale: Object.freeze([
    ['compact', '80%'],
    ['normal', '100%'],
    ['large', '120%']
  ])
});


export function renderAppearanceSettings(
  container
) {

  container.replaceChildren();

  const appearance =
    getStoredAppearance();

  const panel =
    document.createElement('section');

  panel.className =
    'app-appearance-panel settings-center-real-section';

  panel.dataset.settingsSection =
    'appearance';

  panel.append(
    createSettingGroup({
      title:
        'Тема',
      description:
        'Выберите базовый контраст интерфейса.',
      tooltip:
        'Тема меняет только интерфейс приложения. Содержимое карточек, карт и мира не переписывается.',
      control:
        createAppearanceSegmented({
          field:
            'theme',
          value:
            appearance.theme,
          options:
            APPEARANCE_OPTIONS.theme,
          onChange:
            value => updateStoredAppearance({
              theme:
                value
            })
        })
    }),
    createSettingGroup({
      title:
        'Акцентный цвет',
      description:
        'Цвет активных состояний, фокуса и ключевых действий.',
      tooltip:
        'Акцент помогает отличать выбранные и важные элементы. Он не меняет данные workspace.',
      control:
        createAppearanceSwatchGroup({
          field:
            'accent',
          value:
            appearance.accent,
          options:
            APPEARANCE_OPTIONS.accent,
          onChange:
            value => updateStoredAppearance({
              accent:
                value
            })
        })
    }),
    createSettingGroup({
      title:
        'Фон',
      description:
        'Настройте настроение рабочей поверхности.',
      tooltip:
        'Фон влияет на системную оболочку, но не на сохранённое содержимое мира.',
      control:
        createAppearanceSwatchGroup({
          field:
            'background',
          value:
            appearance.background,
          options:
            APPEARANCE_OPTIONS.background,
          onChange:
            value => updateStoredAppearance({
              background:
                value
            })
        })
    }),
    createSettingGroup({
      title:
        'Размер интерфейса',
      description:
        'Масштаб элементов приложения.',
      tooltip:
        'Изменяет масштаб элементов интерфейса. Содержимое карточек и мира не изменяется.',
      control:
        createAppearanceSegmented({
          field:
            'scale',
          value:
            appearance.scale,
          options:
            APPEARANCE_OPTIONS.scale,
          onChange:
            value => updateStoredAppearance({
              scale:
                value
            })
        })
    })
  );

  container.appendChild(
    panel
  );
}


export function renderFutureSettings(
  container,
  section
) {

  container.replaceChildren();

  const empty =
    document.createElement('section');

  empty.className =
    'app-settings-future-section';

  empty.dataset.settingsSection =
    section.id;

  const icon =
    document.createElement('span');

  icon.className =
    'app-settings-future-icon';

  icon.innerHTML =
    iconSvg(
      section.icon,
      'app-settings-future-icon-svg'
    );

  const title =
    document.createElement('h3');

  title.textContent =
    section.title;

  const description =
    document.createElement('p');

  description.textContent =
    section.description;

  const badge =
    document.createElement('span');

  badge.className =
    'app-settings-soon-badge';

  badge.textContent =
    'Скоро';

  empty.append(
    icon,
    title,
    description,
    badge
  );

  container.appendChild(
    empty
  );
}


function createSettingGroup({
  title,
  description,
  tooltip,
  control
}) {

  const row =
    document.createElement('div');

  row.className =
    'app-settings-row';

  const copy =
    document.createElement('div');

  copy.className =
    'app-settings-row-copy';

  const heading =
    document.createElement('div');

  heading.className =
    'app-settings-row-heading';

  const label =
    document.createElement('strong');

  label.textContent =
    title;

  const info =
    document.createElement('button');

  info.type =
    'button';

  info.className =
    'app-settings-info-button';

  info.setAttribute(
    'aria-label',
    `Пояснение: ${title}`
  );

  info.textContent =
    'i';

  applySettingsTooltip(
    info,
    tooltip,
    {
      placement:
        'bottom'
    }
  );

  const note =
    document.createElement('p');

  note.textContent =
    description;

  heading.append(
    label,
    info
  );

  copy.append(
    heading,
    note
  );

  row.append(
    copy,
    control
  );

  return row;
}


function createAppearanceSwatchGroup({
  field,
  value,
  options,
  onChange
}) {

  const list =
    document.createElement('div');

  list.className =
    'app-appearance-swatches';

  for (const [optionValue, optionLabel] of options) {

    const button =
      document.createElement('button');

    button.type =
      'button';

    button.className =
      'app-appearance-swatch';

    button.dataset[field] =
      optionValue;

    button.setAttribute(
      'aria-label',
      optionLabel
    );

    applySettingsTooltip(
      button,
      optionLabel
    );

    if (optionValue === value) {

      button.classList.add(
        'is-selected'
      );
    }

    button.setAttribute(
      'aria-pressed',
      optionValue === value
        ? 'true'
        : 'false'
    );

    button.addEventListener(
      'click',
      () => {

        list
          .querySelectorAll('.app-appearance-swatch')
          .forEach(item => {

            item.classList.remove(
              'is-selected'
            );

            item.setAttribute(
              'aria-pressed',
              'false'
            );
          });

        button.classList.add(
          'is-selected'
        );

        button.setAttribute(
          'aria-pressed',
          'true'
        );

        onChange(
          optionValue
        );
      }
    );

    list.appendChild(
      button
    );
  }

  return list;
}


function createAppearanceSegmented({
  field,
  value,
  options,
  onChange
}) {

  const control =
    document.createElement('div');

  control.className =
    'app-appearance-segmented';

  for (const [optionValue, optionLabel] of options) {

    const button =
      document.createElement('button');

    button.type =
      'button';

    button.dataset[field] =
      optionValue;

    button.textContent =
      optionLabel;

    if (optionValue === value) {

      button.classList.add(
        'is-selected'
      );
    }

    button.setAttribute(
      'aria-pressed',
      optionValue === value
        ? 'true'
        : 'false'
    );

    button.addEventListener(
      'click',
      () => {

        control
          .querySelectorAll('button')
          .forEach(item => {

            item.classList.remove(
              'is-selected'
            );

            item.setAttribute(
              'aria-pressed',
              'false'
            );
          });

        button.classList.add(
          'is-selected'
        );

        button.setAttribute(
          'aria-pressed',
          'true'
        );

        onChange(
          optionValue
        );
      }
    );

    control.appendChild(
      button
    );
  }

  return control;
}
