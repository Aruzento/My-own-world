import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';


const workflow =
  readFileSync(
    '.github/workflows/verify.yml',
    'utf8'
  );


test(
  'verify workflow keeps least-privilege permissions and concurrency',
  () => {

    assert.match(
      workflow,
      /permissions:\n  contents: read/
    );

    assert.match(
      workflow,
      /concurrency:\n  group: verify-\$\{\{ github\.workflow \}\}-\$\{\{ github\.ref \}\}\n  cancel-in-progress: true/
    );
  }
);


test(
  'verify workflow preserves browser smoke artifacts on failure',
  () => {

    assert.match(
      workflow,
      /run: npm run test:browser/
    );

    assert.match(
      workflow,
      /uses: actions\/upload-artifact@v6/
    );

    assert.match(
      workflow,
      /playwright-report\//
    );

    assert.match(
      workflow,
      /test-results\//
    );

    assert.match(
      workflow,
      /retention-days: 7/
    );
  }
);
