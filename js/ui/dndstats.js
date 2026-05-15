/* Импорт функции сохранения текущей страницы */
import {
  saveCurrentPage
} from '../editor/editor.js';


/* Инициализирует поведение DnD stat block */
export function setupDndStats() {

  /* Слушает ввод в любом поле документа */
  document.addEventListener(
    'input',
    event => {

      /* Ищет input значения характеристики */
      const scoreInput =
        event.target.closest(
          '.dnd-stat-score'
        );

      /* Если изменили характеристику */
      if (scoreInput) {

        /* Обновляем модификатор */
        updateStatModifier(
          scoreInput
        );
      }

      /* Ищет любое поле внутри DnD блока */
      const dndField =
        event.target.closest(
          '.dnd-stats-block input'
        );

      /* Если изменилось поле DnD блока */
      if (dndField) {

        /* Сохраняем текущую страницу */
        saveCurrentPage();
      }
    }
  );


  /* Слушает change-события для checkbox */
  document.addEventListener(
    'change',
    event => {

      /* Ищет checkbox навыка или спасброска */
      const checkbox =
        event.target.closest(
          '.dnd-check-point'
        );

      /* Если изменился не checkbox — выходим */
      if (!checkbox) return;

      /* Сохраняем текущую страницу */
      saveCurrentPage();
    }
  );
}


/* Обновляет все модификаторы в открытой карточке */
export function renderDndStats() {

  /* Находит все input характеристик */
  const inputs =
    document.querySelectorAll(
      '.dnd-stat-score'
    );

  /* Пересчитывает каждый input */
  inputs.forEach(input => {

    /* Обновляет модификатор */
    updateStatModifier(
      input
    );
  });
}


/* Обновляет один модификатор */
function updateStatModifier(
  input
) {

  /* Преобразует значение input в число */
  const value =
    Number(input.value);

  /* Если значение не число — берём 10 */
  const score =
    Number.isFinite(value)
      ? value
      : 10;

  /* Считает модификатор DnD */
  const modifier =
    Math.floor(
      (score - 10) / 2
    );

  /* Находит строку характеристики */
  const row =
    input.closest(
      '.dnd-stat-row'
    );

  /* Если строка не найдена — выходим */
  if (!row) return;

  /* Находит элемент модификатора */
  const modifierElement =
    row.querySelector(
      '.dnd-stat-modifier'
    );

  /* Если модификатора нет — выходим */
  if (!modifierElement) return;

  /* Записывает модификатор с плюсом для положительных значений */
  modifierElement.textContent =
    modifier >= 0
      ? `+${modifier}`
      : String(modifier);
}