import {
  saveAssetFile,
  getImageURL
} from '../storage/assetStorage.js';

import {
  saveCurrentPage
} from './editor.js';

import {
  openPopupNearAnchor,
  registerPopup
} from '../ui/popupManager.js';


let cropPopup = null;
let activeCropImage = null;
let cropSaveTimer = null;


export function setupPortraitUploads(
  editor
) {

  editor.addEventListener(
    'click',
    async event => {

      const uploadButton =
        event.target.closest(
          '.upload-portrait-btn, .image-upload-btn'
        );

      const deleteButton =
        event.target.closest(
          '.image-delete-btn'
        );

      const cropButton =
        event.target.closest(
          '.image-crop-btn'
        );

      if (uploadButton) {

        event.preventDefault();
        event.stopPropagation();

        const container =
          getImageContainer(
            uploadButton
          );

        if (!container) return;

        await uploadImage(
          container
        );

        return;
      }

      if (deleteButton) {

        event.preventDefault();
        event.stopPropagation();

        const container =
          getImageContainer(
            deleteButton
          );

        if (!container) return;

        deleteImage(
          container
        );

        await saveCurrentPage();

        return;
      }

      if (cropButton) {

        event.preventDefault();
        event.stopPropagation();

        const container =
          getImageContainer(
            cropButton
          );

        const image =
          container?.querySelector(
            'img[data-asset]'
          );

        if (!image) return;

        openCropPopup(
          cropButton,
          image
        );
      }
    }
  );
}


async function uploadImage(
  container
) {

  const imageFile =
    await pickImageFile();

  if (!imageFile) return;

  const asset =
    await writeAssetFile(
      imageFile
    );

  renderUploadedImage(
    container,
    asset.url,
    asset.path
  );

  await saveCurrentPage();
}


async function pickImageFile() {

  try {

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

    return fileHandle?.getFile();

  } catch (error) {

    if (error?.name !== 'AbortError') {

      throw error;
    }
  }

  return null;
}


async function writeAssetFile(
  imageFile
) {

  return saveAssetFile(
    imageFile
  );
}


function renderUploadedImage(
  container,
  imageURL,
  filename
) {

  const imageHTML = `
    <img
      src="${imageURL}"
      data-asset="${filename}"
      data-crop-x="50"
      data-crop-y="50"
      data-crop-zoom="1"
      alt=""
    >
  `;

  if (
    container.classList.contains('image-block')
  ) {

    const frame =
      container.querySelector('.image-block-frame');

    frame.innerHTML =
      imageHTML;

    ensureImageActions(
      frame
    );

    applyImageCrop(
      frame.querySelector('img[data-asset]')
    );

    return;
  }

  container.innerHTML =
    imageHTML;

  ensureImageActions(
    container
  );

  applyImageCrop(
    container.querySelector('img[data-asset]')
  );
}


function deleteImage(
  container
) {

  closeCropPopup();

  if (
    container.classList.contains('image-block')
  ) {

    const frame =
      container.querySelector('.image-block-frame');

    frame.innerHTML = '';

    appendUploadButton(
      frame,
      'image-upload-btn',
      '+ Загрузить картинку'
    );

    return;
  }

  container.innerHTML = '';

  appendUploadButton(
    container,
    'upload-portrait-btn',
    '+ Image'
  );
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

      img.src =
        await getImageURL(
          filename
        );

      applyImageCrop(
        img
      );

      ensureImageActions(
        getImageFrame(
          img
        )
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

  const imageFile =
    await pickImageFile();

  if (!imageFile) return;

  const asset =
    await writeAssetFile(
      imageFile
    );

  const img =
    document.createElement('img');

  img.src =
    asset.url;

  img.alt =
    imageFile.name;

  img.dataset.asset =
    asset.path;

  img.dataset.cropX =
    '50';

  img.dataset.cropY =
    '50';

  img.dataset.cropZoom =
    '1';

  applyImageCrop(
    img
  );

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


function ensureImageActions(
  frame
) {

  if (!frame) return;

  if (
    !frame.querySelector('img[data-asset]')
  ) return;

  const existingActions =
    frame.querySelector('.image-runtime-actions');

  if (existingActions) return;

  const actions =
    document.createElement('div');

  actions.className =
    'image-runtime-actions';

  actions.dataset.runtime =
    'true';

  actions.setAttribute(
    'contenteditable',
    'false'
  );

  actions.innerHTML = `
    <button class="image-delete-btn" type="button">Удалить</button>
    <button class="image-crop-btn" type="button">Кадрировать</button>
  `;

  frame.appendChild(
    actions
  );
}


function appendUploadButton(
  container,
  className,
  label
) {

  const button =
    document.createElement('button');

  button.className =
    className;

  button.type =
    'button';

  button.textContent =
    label;

  button.dataset.runtime =
    'true';

  button.setAttribute(
    'contenteditable',
    'false'
  );

  container.appendChild(
    button
  );
}


function getImageContainer(
  element
) {

  return element.closest(
    '.image-block, .media-box'
  );
}


function getImageFrame(
  image
) {

  return image.closest(
    '.image-block-frame, .media-box'
  );
}


function openCropPopup(
  anchor,
  image
) {

  const popup =
    getCropPopup();

  activeCropImage =
    image;

  popup.querySelector('.image-crop-x').value =
    getCropValue(
      image,
      'cropX',
      50
    );

  popup.querySelector('.image-crop-y').value =
    getCropValue(
      image,
      'cropY',
      50
    );

  popup.querySelector('.image-crop-zoom').value =
    getCropValue(
      image,
      'cropZoom',
      1
    );

  openPopupNearAnchor(
    popup,
    anchor,
    {
      fallbackWidth: 280,
      fallbackHeight: 220
    }
  );
}


function getCropPopup() {

  if (cropPopup) return cropPopup;

  cropPopup =
    document.createElement('div');

  cropPopup.className =
    'image-crop-popup hidden ui-panel';

  cropPopup.innerHTML = `
    <div class="image-crop-title">Кадрирование</div>

    <label class="image-crop-field">
      <span>Горизонталь</span>
      <input class="image-crop-x" type="range" min="0" max="100" value="50">
    </label>

    <label class="image-crop-field">
      <span>Вертикаль</span>
      <input class="image-crop-y" type="range" min="0" max="100" value="50">
    </label>

    <label class="image-crop-field">
      <span>Масштаб</span>
      <input class="image-crop-zoom" type="range" min="1" max="3" step="0.05" value="1">
    </label>

    <div class="image-crop-actions">
      <button class="image-crop-done ui-button" type="button">Готово</button>
    </div>
  `;

  cropPopup
    .querySelectorAll('input')
    .forEach(input => {

      input.addEventListener(
        'input',
        updateActiveCrop
      );
    });

  cropPopup
    .querySelector('.image-crop-done')
    .addEventListener(
      'click',
      closeCropPopup
    );

  document.body.appendChild(
    cropPopup
  );

  registerPopup({
    popup: cropPopup,
    close: closeCropPopup
  });

  return cropPopup;
}


function updateActiveCrop() {

  if (!activeCropImage) return;

  activeCropImage.dataset.cropX =
    cropPopup.querySelector('.image-crop-x').value;

  activeCropImage.dataset.cropY =
    cropPopup.querySelector('.image-crop-y').value;

  activeCropImage.dataset.cropZoom =
    cropPopup.querySelector('.image-crop-zoom').value;

  applyImageCrop(
    activeCropImage
  );

  scheduleCropSave();
}


function applyImageCrop(
  image
) {

  if (!image) return;

  const x =
    getCropValue(
      image,
      'cropX',
      50
    );

  const y =
    getCropValue(
      image,
      'cropY',
      50
    );

  const zoom =
    getCropValue(
      image,
      'cropZoom',
      1
    );

  image.style.objectPosition =
    `${x}% ${y}%`;

  image.style.transformOrigin =
    `${x}% ${y}%`;

  image.style.transform =
    zoom > 1
      ? `scale(${zoom})`
      : '';
}


function getCropValue(
  image,
  key,
  fallback
) {

  const value =
    Number(
      image.dataset[key]
    );

  return Number.isFinite(value)
    ? value
    : fallback;
}


function scheduleCropSave() {

  clearTimeout(
    cropSaveTimer
  );

  cropSaveTimer =
    setTimeout(
      saveCurrentPage,
      250
    );
}


function closeCropPopup() {

  if (!cropPopup) return;

  if (activeCropImage) {

    clearTimeout(
      cropSaveTimer
    );

    saveCurrentPage();
  }

  cropPopup.classList.add(
    'hidden'
  );

  activeCropImage =
    null;
}
