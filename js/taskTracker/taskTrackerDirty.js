import {
  writeTaskTrackerData
} from './taskTrackerWriteData.js';


// Единый способ записать модель и попросить общий autosave сохранить страницу.

export function commitTaskTrackerData(
  tracker,
  model
) {

  writeTaskTrackerData(
    tracker,
    model.data
  );

  tracker.dispatchEvent(
    new InputEvent(
      'input',
      {
        bubbles: true,
        inputType: 'insertText'
      }
    )
  );
}
