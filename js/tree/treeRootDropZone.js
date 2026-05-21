export function renderRootDropZone(
  container
) {

  const rootZone =
    document.createElement('div');

  rootZone.className =
    'tree-root-drop-zone';

  rootZone.textContent =
    'Корень';


  container.appendChild(
    rootZone
  );
}
