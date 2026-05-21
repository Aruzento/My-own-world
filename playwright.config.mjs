import {
  defineConfig,
  devices
} from '@playwright/test';


// Конфиг браузерных smoke-тестов. Unit-тесты остаются в `node:test`.

export default defineConfig({
  testDir: './tests/browser',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: false,
  reporter: [
    ['list']
  ],
  use: {
    baseURL: 'http://127.0.0.1:5179',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ]
});
