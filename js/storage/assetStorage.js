import { state } from '../state.js';


export async function getImageURL(
  filename
) {

  const assetsDir =
    await state.workspaceHandle
      .getDirectoryHandle(
        'assets'
      );

  const fileHandle =
    await assetsDir.getFileHandle(
      filename
    );

  const file =
    await fileHandle.getFile();

  return URL.createObjectURL(
    file
  );
}