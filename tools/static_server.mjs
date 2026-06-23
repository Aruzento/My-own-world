import {
  createReadStream,
  existsSync,
  statSync
} from 'node:fs';

import {
  createServer
} from 'node:http';

import {
  extname,
  join,
  normalize,
  resolve
} from 'node:path';


// Минимальный static server для локального приложения и browser smoke.

const root =
  process.cwd();

const port =
  Number(
    getArgValue('--port') || 5179
  );

const mimeTypes =
  new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.mp3', 'audio/mpeg'],
    ['.wav', 'audio/wav'],
    ['.ogg', 'audio/ogg'],
    ['.m4a', 'audio/mp4'],
    ['.aac', 'audio/aac'],
    ['.flac', 'audio/flac'],
    ['.webm', 'audio/webm'],
    ['.json', 'application/json; charset=utf-8']
  ]);


const server =
  createServer(
    handleRequest
  );

server.listen(
  port,
  '127.0.0.1',
  () => {

    console.log(
      `Static server: http://127.0.0.1:${port}/`
    );
  }
);

process.on(
  'SIGTERM',
  closeServer
);

process.on(
  'SIGINT',
  closeServer
);


function handleRequest(
  request,
  response
) {

  const url =
    new URL(
      request.url || '/',
      `http://127.0.0.1:${port}`
    );

  const pathname =
    decodeURIComponent(
      url.pathname
    );

  const filePath =
    getSafeFilePath(
      pathname
    );

  if (!filePath) {

    sendText(
      response,
      403,
      'Forbidden'
    );

    return;
  }

  if (
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {

    sendText(
      response,
      404,
      'Not found'
    );

    return;
  }

  response.writeHead(
    200,
    {
      'Content-Type': getMimeType(filePath)
    }
  );

  createReadStream(
    filePath
  ).pipe(
    response
  );
}


function getSafeFilePath(
  pathname
) {

  const relativePath =
    pathname === '/'
      ? 'index.html'
      : pathname.replace(/^\/+/, '');

  const filePath =
    resolve(
      root,
      normalize(relativePath)
    );

  if (!filePath.startsWith(root)) {

    return null;
  }

  return filePath;
}


function getMimeType(
  filePath
) {

  return mimeTypes.get(
    extname(filePath).toLowerCase()
  ) || 'application/octet-stream';
}


function sendText(
  response,
  status,
  text
) {

  response.writeHead(
    status,
    {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  );

  response.end(
    text
  );
}


function getArgValue(
  name
) {

  const index =
    process.argv.indexOf(
      name
    );

  return index >= 0
    ? process.argv[index + 1]
    : '';
}


function closeServer() {

  server.close(
    () => {

      process.exit(
        0
      );
    }
  );
}
