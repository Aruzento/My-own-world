const user = {
  image: '',
  name: '{user.name}',
  tarif: '{user.tarif}'
};

let popup = null;


export function setupProfile() {

  const button =
    document.getElementById('profileButton');

  if (!button) return;

  renderProfileButton(
    button
  );

  button.addEventListener(
    'click',
    event => {

      event.preventDefault();
      event.stopPropagation();

      openProfilePopup(
        button
      );
    }
  );

  document.addEventListener(
    'click',
    event => {

      if (
        !popup ||
        popup.classList.contains('hidden') ||
        popup.contains(event.target) ||
        button.contains(event.target)
      ) {

        return;
      }

      closeProfilePopup();
    }
  );
}


function renderProfileButton(
  button
) {

  const avatar =
    button.querySelector('.profile-avatar');

  const image =
    button.querySelector('.profile-image');

  if (user.image) {

    image.src =
      user.image;

    image.hidden =
      false;

    avatar.classList.add(
      'has-image'
    );

  } else {

    image.hidden =
      true;

    avatar.classList.remove(
      'has-image'
    );
  }

  button.querySelector('.profile-name').textContent =
    user.name;

  button.querySelector('.profile-tarif').textContent =
    user.tarif;
}


function openProfilePopup(
  anchor
) {

  const element =
    getProfilePopup();

  element.classList.remove(
    'hidden'
  );

  positionProfilePopup(
    element,
    anchor
  );
}


function closeProfilePopup() {

  if (!popup) return;

  popup.classList.add(
    'hidden'
  );
}


function getProfilePopup() {

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.className =
    'profile-popup hidden';

  popup.innerHTML = `
    <button
      class="profile-popup-close"
      type="button"
      title="Закрыть"
    >
      Закрыть
    </button>
  `;

  popup
    .querySelector('.profile-popup-close')
    .addEventListener(
      'click',
      closeProfilePopup
    );

  document.body.appendChild(
    popup
  );

  return popup;
}


function positionProfilePopup(
  element,
  anchor
) {

  const rect =
    anchor.getBoundingClientRect();

  const popupWidth =
    element.offsetWidth || 300;

  const popupHeight =
    element.offsetHeight || 220;

  const left =
    Math.min(
      rect.left,
      window.innerWidth - popupWidth - 12
    );

  let top =
    rect.top - popupHeight - 10;

  if (top < 12) {

    top =
      rect.bottom + 10;
  }

  element.style.left =
    `${Math.max(12, left)}px`;

  element.style.top =
    `${Math.max(12, top)}px`;
}
