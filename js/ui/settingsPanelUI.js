import {
  iconSvg
} from '../core/icons.js';


export function createSettingsSectionHeader({
  iconName,
  title,
  description
}) {

  const header =
    document.createElement('div');

  header.className =
    'app-settings-section-head';

  const icon =
    document.createElement('span');

  icon.className =
    'app-settings-section-icon';

  icon.innerHTML =
    iconSvg(
      iconName,
      'app-settings-section-icon-svg'
    );

  const text =
    document.createElement('div');

  text.className =
    'app-settings-section-copy';

  const heading =
    document.createElement('h3');

  heading.textContent =
    title;

  const note =
    document.createElement('p');

  note.textContent =
    description;

  text.append(
    heading,
    note
  );

  header.append(
    icon,
    text
  );

  return header;
}


export function setButtonContent(
  button,
  iconName,
  label
) {

  const icon =
    document.createElement('span');

  icon.className =
    'app-maintenance-action-mark';

  icon.innerHTML =
    iconSvg(
      iconName,
      'app-maintenance-action-icon',
      {
        size:
          'sm'
      }
    );

  const text =
    document.createElement('span');

  text.textContent =
    label;

  button.replaceChildren(
    icon,
    text
  );
}
