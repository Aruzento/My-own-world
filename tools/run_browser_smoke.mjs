import {
  spawn
} from 'node:child_process';

import {
  request
} from 'node:http';

import {
  join
} from 'node:path';

import {
  fileURLToPath
} from 'node:url';


// Управляемый запуск browser smoke: поднимаем static server, запускаем Playwright
// и закрываем сервер сами, чтобы команда не зависала на webServer lifecycle.

export const DEFAULT_BROWSER_SMOKE_PORT =
  5179;


if (isMainModule()) {

  await main();
}


export function getStaticServerArgs(
  port =
    DEFAULT_BROWSER_SMOKE_PORT
) {

  return [
    'tools/static_server.mjs',
    '--port',
    String(port)
  ];
}


export function getPlaywrightCliArgs(
  extraArgs =
    []
) {

  return [
    join(
      'node_modules',
      '@playwright',
      'test',
      'cli.js'
    ),
    'test',
    ...extraArgs
  ];
}


async function main() {

  const port =
    DEFAULT_BROWSER_SMOKE_PORT;

  const url =
    `http://127.0.0.1:${port}/`;

  const server =
    spawn(
      process.execPath,
      getStaticServerArgs(
        port
      ),
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
      await runPlaywright(
        process.argv.slice(
          2
        )
      );

    closeServer(
      server
    );

    process.exit(
      exitCode
    );

  } catch (error) {

    closeServer(
      server
    );

    console.error(
      error
    );

    process.exit(
      1
    );
  }
}


function isMainModule() {

  return fileURLToPath(
    import.meta.url
  ) === process.argv[1];
}


function runPlaywright(
  extraArgs =
    []
) {

  const args =
    getPlaywrightCliArgs(
      extraArgs
    );

  if (extraArgs.length > 0) {

    console.log(
      `Playwright args: ${extraArgs.join(' ')}`
    );
  }

  const child =
    spawn(
      process.execPath,
      args,
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


function closeServer(
  server
) {

  if (!server.killed) {

    server.kill(
      'SIGTERM'
    );
  }
}
