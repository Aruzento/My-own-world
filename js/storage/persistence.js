const DB_NAME = 'myworld-db';

const STORE_NAME = 'handles';


function openDB() {

  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {

      request.result.createObjectStore(
        STORE_NAME
      );
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


export async function saveWorkspaceHandle(
  handle
) {

  const db = await openDB();

  const tx =
    db.transaction(
      STORE_NAME,
      'readwrite'
    );

  tx.objectStore(STORE_NAME)
    .put(handle, 'workspace');
}


export async function loadWorkspaceHandle() {

  const db = await openDB();

  return new Promise(resolve => {

    const tx =
      db.transaction(
        STORE_NAME,
        'readonly'
      );

    const request =
      tx.objectStore(STORE_NAME)
        .get('workspace');

    request.onsuccess = async () => {

      const handle =
        request.result;

      if (!handle) {

        resolve(null);

        return;
      }

      const permission =
        await handle.queryPermission({
          mode: 'readwrite'
        });

      if (permission === 'granted') {

        resolve(handle);

        return;
      }

      resolve(null);
    };
  });
}
