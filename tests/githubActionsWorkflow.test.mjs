import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';


const workflow =
  normalizeLineEndings(
    readFileSync(
      '.github/workflows/verify.yml',
      'utf8'
    )
  );


function normalizeLineEndings(
  value
) {

  return value.replace(
    /\r\n/g,
    '\n'
  );
}


function assertVerifyWorkflowPolicy(
  workflowText
) {

  const normalized =
    normalizeLineEndings(
      workflowText
    );

  assert.match(
    normalized,
    /permissions:\n  contents: read/
  );

  assert.match(
    normalized,
    /concurrency:\n  group: verify-\$\{\{ github\.workflow \}\}-\$\{\{ github\.ref \}\}\n  cancel-in-progress: true/
  );
}


test(
  'verify workflow keeps least-privilege permissions and concurrency',
  () => {

    assertVerifyWorkflowPolicy(
      workflow,
    );
  }
);


test(
  'verify workflow policy assertions are line-ending independent',
  () => {

    const fixture =
      [
        'name: Verify',
        '',
        'permissions:',
        '  contents: read',
        '',
        'concurrency:',
        '  group: verify-${{ github.workflow }}-${{ github.ref }}',
        '  cancel-in-progress: true',
        ''
      ].join(
        '\n'
      );

    assertVerifyWorkflowPolicy(
      fixture
    );

    assertVerifyWorkflowPolicy(
      fixture.replace(
        /\n/g,
        '\r\n'
      )
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
