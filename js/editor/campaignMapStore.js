import {
  CampaignMapModel
} from './campaignMapModel.js';


const storeByMap =
  new WeakMap();


// CampaignMapStore — владелец модели открытой карты.
// Он хранит dirty-state и дает единый путь: изменить модель, затем применить ее к DOM.

export class CampaignMapStore {

  constructor(
    map = null,
    model = null
  ) {

    this.map =
      map;

    this.model =
      model || new CampaignMapModel();

    this.dirty =
      false;
  }


  refreshFromDOM(
    map = this.map
  ) {

    if (map) {

      this.map =
        map;

      this.model =
        CampaignMapModel.fromElement(
          map
        );

      this.commitToDOM();

      this.dirty =
        false;
    }

    return this.model;
  }


  getModel() {

    return this.model;
  }


  commitToDOM() {

    if (this.map) {

      this.model.commitToElement(
        this.map
      );

      this.map.campaignMapModel =
        this.model;
    }

    return this.model;
  }


  markDirty() {

    this.dirty =
      true;

    return this.model;
  }


  clearDirty() {

    this.dirty =
      false;
  }


  isDirty() {

    return this.dirty;
  }


  addToken(
    data
  ) {

    const token =
      this.model.addToken(
        data
      );

    this.markDirty();
    this.commitToDOM();

    return token;
  }


  updateToken(
    tokenId,
    patch
  ) {

    const token =
      this.model.updateToken(
        tokenId,
        patch
      );

    if (token) {

      this.markDirty();
      this.commitToDOM();
    }

    return token;
  }


  moveToken(
    tokenId,
    position
  ) {

    return this.updateToken(
      tokenId,
      position
    );
  }


  resizeToken(
    tokenId,
    size
  ) {

    return this.updateToken(
      tokenId,
      { size }
    );
  }


  rotateToken(
    tokenId,
    rotation
  ) {

    return this.updateToken(
      tokenId,
      { rotation }
    );
  }


  removeToken(
    tokenId
  ) {

    const removed =
      this.model.removeToken(
        tokenId
      );

    if (removed) {

      this.markDirty();
      this.commitToDOM();
    }

    return removed;
  }


  addShape(
    data
  ) {

    const shape =
      this.model.addShape(
        data
      );

    this.markDirty();
    this.commitToDOM();

    return shape;
  }


  updateShape(
    shapeId,
    patch
  ) {

    const shape =
      this.model.updateShape(
        shapeId,
        patch
      );

    if (shape) {

      this.markDirty();
      this.commitToDOM();
    }

    return shape;
  }


  moveShape(
    shapeId,
    position
  ) {

    return this.updateShape(
      shapeId,
      position
    );
  }


  resizeShape(
    shapeId,
    patch
  ) {

    return this.updateShape(
      shapeId,
      patch
    );
  }


  removeShape(
    shapeId
  ) {

    const removed =
      this.model.removeShape(
        shapeId
      );

    if (removed) {

      this.markDirty();
      this.commitToDOM();
    }

    return removed;
  }


  setGrid(
    patch
  ) {

    const grid =
      this.model.setGrid(
        patch
      );

    this.markDirty();
    this.commitToDOM();

    return grid;
  }


  updateFog(
    patch
  ) {

    const fog =
      this.model.updateFog(
        patch
      );

    this.markDirty();
    this.commitToDOM();

    return fog;
  }


  setView(
    view
  ) {

    const nextView =
      this.model.setView(
        view
      );

    this.markDirty();
    this.commitToDOM();

    return nextView;
  }


  setInitiative(
    initiative
  ) {

    const nextInitiative =
      this.model.setInitiative(
        initiative
      );

    this.markDirty();
    this.commitToDOM();

    return nextInitiative;
  }
}


export function getCampaignMapStore(
  map
) {

  if (!map) return null;

  const existing =
    storeByMap.get(
      map
    );

  if (existing) return existing;

  const store =
    new CampaignMapStore(
      map
    );

  store.refreshFromDOM(
    map
  );

  storeByMap.set(
    map,
    store
  );

  return store;
}


export function refreshCampaignMapStore(
  map
) {

  const store =
    getCampaignMapStore(
      map
    );

  store?.refreshFromDOM(
    map
  );

  return store;
}
