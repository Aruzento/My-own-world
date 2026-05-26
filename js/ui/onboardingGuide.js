const ONBOARDING_SECTIONS = {
  quickstart: {
    title: 'Быстрый старт',
    items: [
      {
        title: '1. Выберите workspace',
        text: 'Нажмите кнопку папки в sidebar. Workspace - это папка мира, где приложение хранит pages и assets.'
      },
      {
        title: '2. Создайте первую сущность',
        text: 'Кнопка плюс открывает создание карточки, карты, трекера задач или задачи. Карточка подходит для лора, NPC, предметов и правил.'
      },
      {
        title: '3. Организуйте дерево',
        text: 'Строки дерева можно перетаскивать внутрь других сущностей, выше, ниже или в корень. Это меняет parent и order страницы.'
      },
      {
        title: '4. Связывайте лор',
        text: 'Wiki-link вида [[Название]] связывает карточки. Видимый текст ссылки не перезаписывается, чтобы сохранять склонения.'
      }
    ]
  },
  product: {
    title: 'Как устроено',
    items: [
      {
        title: 'Карточки',
        text: 'Карточка - основная wiki-сущность. Внутри есть persistent content: заголовок, тип, теги, alias, описание и блоки.'
      },
      {
        title: 'Карта кампании',
        text: 'Карта - отдельная сущность. Она хранит фон, сетку, туман, токены, фигуры, слои и инициативу через модель карты.'
      },
      {
        title: 'Task Tracker',
        text: 'Трекер задач - отдельная система с колонками и задачами. Он не является карточкой и хранит собственную JSON-модель.'
      },
      {
        title: 'Runtime UI',
        text: 'Кнопки, popup, toolbar и controls не должны сохраняться в HTML карточки. Для этого используется data-runtime и serializer.'
      }
    ]
  },
  checklist: {
    title: 'UX checklist',
    items: [
      {
        title: 'Перед изменением UI',
        text: 'Проверьте desktop и узкое окно, popup у границ экрана, отсутствие наложения текста и доступность основного действия.'
      },
      {
        title: 'Перед изменением карты',
        text: 'Проверьте save/reload, presentation sync, скрытые сущности, fog, grid, zoom/pan и контекстные меню.'
      },
      {
        title: 'Перед изменением карточек',
        text: 'Проверьте clean-save, runtime controls, вставку plain text, wiki-links, undo/redo и Ctrl+S.'
      },
      {
        title: 'Перед коммитом',
        text: 'Запустите npm run verify и npm run test:browser. Если менялась документация архитектуры, обновите manual.'
      }
    ]
  }
};


export function setupOnboardingGuide() {

  const popup =
    document.getElementById('onboardingPopup');

  const title =
    document.getElementById('onboardingTitle');

  const body =
    document.getElementById('onboardingBody');

  const closeButton =
    document.getElementById('onboardingCloseBtn');

  if (
    !popup ||
    !title ||
    !body ||
    !closeButton
  ) return;

  document.addEventListener(
    'click',
    event => {

      const button =
        event.target.closest('[data-onboarding-open]');

      if (!button) return;

      openOnboardingSection(
        button.dataset.onboardingOpen,
        {
          popup,
          title,
          body
        }
      );
    }
  );

  closeButton.addEventListener(
    'click',
    () => popup.classList.add('hidden')
  );
}


function openOnboardingSection(
  sectionKey,
  elements
) {

  const section =
    ONBOARDING_SECTIONS[sectionKey] ||
    ONBOARDING_SECTIONS.quickstart;

  elements.title.textContent =
    section.title;

  elements.body.innerHTML =
    section.items
      .map(renderOnboardingItem)
      .join('');

  elements.popup.classList.remove('hidden');
}


function renderOnboardingItem(
  item
) {

  return `
    <section class="onboarding-card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
    </section>
  `;
}


function escapeHtml(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
