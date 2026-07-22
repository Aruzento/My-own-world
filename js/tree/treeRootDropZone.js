import {
  iconSvg
} from '../core/icons.js';


export function renderRootDropZone(
  container
) {

  const rootZone =
    document.createElement('div');

  rootZone.className =
    'tree-root-drop-zone';

  const label =
    document.createElement('span');

  label.className =
    'tree-root-label';

  label.textContent =
    'Корень';

  const actions =
    document.createElement('div');

  actions.className =
    'tree-root-actions';

  actions.append(
    createRootActionButton({
      id: 'newPageBtn',
      action:
        'create-page',
      icon:
        'plus',
      label:
        'Новая страница'
    }),
    createRootActionButton({
      action:
        'create-folder',
      icon:
        'folder',
      label:
        'Новая папка'
    })
  );

  rootZone.append(
    label,
    actions
  );


  container.appendChild(
    rootZone
  );
}


function createRootActionButton({
  id = '',
  action,
  icon,
  label
}) {

  const button =
    document.createElement('button');

  button.className =
    'tree-root-action';

  button.type =
    'button';

  button.title =
    label;

  button.setAttribute(
    'aria-label',
    label
  );

  button.dataset.tooltip =
    label;

  button.dataset.tooltipPlacement =
    'left';

  if (id) {

    button.id =
      id;
  }

  if (action === 'create-page') {

    button.dataset.createPage =
      'true';
  }

  if (action === 'create-folder') {

    button.dataset.createFolder =
      'true';
  }

  button.innerHTML =
    iconSvg(
      icon
    );

  return button;
}
