import {
  spawn
} from 'node:child_process';

import {
  request
} from 'node:http';

import {
  join
} from 'node:path';


// Управляемый запуск browser smoke: поднимаем static server, запускаем Playwright
// и закрываем сервер сами, чтобы команда не зависала на webServer lifecycle.

const port =
  5179;

const url =
  `http://127.0.0.1:${port}/`;

const server =
  spawn(
    process.execPath,
    [
      'tools/static_server.mjs',
      '--port',
      String(port)
    ],
    {
      stdio: [
        'ignore',
        'inherit',
        'inherit'
      ]
    }
  );

try {

  await waitForServer(
    url
  );

  const exitCode =
    await runPlaywright();

  closeServer();

  process.exit(
    exitCode
  );

} catch (error) {

  closeServer();

  console.error(
    error
  );

  process.exit(
    1
  );
}


function runPlaywright() {

  const child =
    spawn(
      process.execPath,
      [
        join(
          'node_modules',
          '@playwright',
          'test',
          'cli.js'
        ),
        'test'
      ],
      {
        stdio: 'inherit'
      }
    );

  return new Promise(resolve => {

    child.on(
      'exit',
      code => {

        resolve(
          code || 0
        );
      }
    );
  });
}


function waitForServer(
  targetUrl
) {

  const startedAt =
    Date.now();

  return new Promise((resolve, reject) => {

    const tick =
      () => {

        const req =
          request(
            targetUrl,
            response => {

              response.resume();

              resolve();
            }
          );

        req.on(
          'error',
          () => {

            if (Date.now() - startedAt > 10_000) {

              reject(
                new Error('Static server не стартовал за 10 секунд')
              );

              return;
            }

            setTimeout(
              tick,
              150
            );
          }
        );

        req.end();
      };

    tick();
  });
}


function closeServer() {

  if (!server.killed) {

    server.kill(
      'SIGTERM'
    );
  }
}
