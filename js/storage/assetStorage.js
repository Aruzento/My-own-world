import {
  getAssetAdapter
} from './assetAdapter.js';


export async function getImageURL(
  filename
) {

  return getAssetAdapter()
    .resolveUrl(
      filename
    );
}


export async function saveAssetFile(
  file,
  options = {}
) {

  return getAssetAdapter()
    .importFile(
      file,
      options
    );
}
