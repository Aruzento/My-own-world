import { state } from '../state.js';

import {
  writeFile
} from '../storage/storage.js';

import {
  saveCurrentPage
} from './editor.js';


export function setupPortraitUploads(
  editor
) {

  editor.addEventListener(
    'click',
    async event => {

      const button =
        event.target.closest(
          '.upload-portrait-btn'
        );

      if (!button) return;

      const portrait =
        button.closest(
          '.media-box'
        );

      if (!portrait) return;

      await uploadPortrait(
        portrait
      );
    }
  );
}


async function uploadPortrait(
  container
) {

  if (!state.workspaceHandle) return;

  const [fileHandle] =
    await window.showOpenFilePicker({

      types: [{
        description: 'Images',

        accept: {
          'image/*': [
            '.png',
            '.jpg',
            '.jpeg',
            '.webp'
          ]
        }
      }]
    });

  const imageFile =
    await fileHandle.getFile();

  const assetsDir =
    await state.workspaceHandle
      .getDirectoryHandle(
        'assets'
      );

  const targetHandle =
    await assetsDir.getFileHandle(
      imageFile.name,
      { create: true }
    );

  await writeFile(
    targetHandle,
    await imageFile.arrayBuffer(),
    `asset:${imageFile.name}`
  );

  const localFile =
    await targetHandle.getFile();

  const imageURL =
    URL.createObjectURL(
      localFile
    );

  container.innerHTML = `
    <img
      src="${imageURL}"
      data-asset="${imageFile.name}"
    >
  `;

  await saveCurrentPage();
}


export async function restoreAssetImages(
  editor
) {

  const images =
    editor.querySelectorAll(
      'img[data-asset]'
    );

  for (const img of images) {

    const filename =
      img.dataset.asset;

    try {

      const assetsDir =
        await state.workspaceHandle
          .getDirectoryHandle(
            'assets'
          );

      const fileHandle =
        await assetsDir
          .getFileHandle(
            filename
          );

      const file =
        await fileHandle.getFile();

      img.src =
        URL.createObjectURL(
          file
        );

    } catch (error) {

      console.warn(
        'Не удалось восстановить картинку:',
        filename
      );
    }
  }
}


export async function insertImage(
  editor
) {

  if (!state.workspaceHandle) return;

  const [fileHandle] =
    await window.showOpenFilePicker({

      types: [{
        description: 'Images',

        accept: {
          'image/*': [
            '.png',
            '.jpg',
            '.jpeg',
            '.webp',
            '.gif'
          ]
        }
      }]
    });

  const imageFile =
    await fileHandle.getFile();

  const assetsDir =
    await state.workspaceHandle
      .getDirectoryHandle(
        'assets'
      );

  const targetHandle =
    await assetsDir.getFileHandle(
      imageFile.name,
      { create: true }
    );

  await writeFile(
    targetHandle,
    await imageFile.arrayBuffer(),
    `asset:${imageFile.name}`
  );


  const localFile =
    await targetHandle.getFile();

  const imageURL =
    URL.createObjectURL(
      localFile
    );


  const img =
    document.createElement('img');

  img.src =
    imageURL;

  img.alt =
    imageFile.name;

  img.dataset.asset =
    imageFile.name;


  editor.appendChild(
    img
  );


  const p =
    document.createElement('p');

  p.innerHTML =
    '<br>';

  editor.appendChild(
    p
  );


  await saveCurrentPage();
}
