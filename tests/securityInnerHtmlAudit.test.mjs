import assert from 'node:assert/strict';
import {
  readFileSync
} from 'node:fs';
import test from 'node:test';

import {
  createWorldPackageImportPreview
} from '../js/worldPackage/worldPackageModel.js';


const read =
  path => readFileSync(
    new URL(
      `../${path}`,
      import.meta.url
    ),
    'utf8'
  );


test(
  'security audit keeps known runtime labels out of raw innerHTML',
  () => {

    const files = {
      aliases:
        read('js/ui/aliases.js'),
      tags:
        read('js/ui/ui.js'),
      backlinks:
        read('js/ui/backlinks.js'),
      wikiLinkCreateMenu:
        read('js/editor/wikiLinkCreateMenu.js'),
      campaignMapPicker:
        read('js/editor/campaignMapPicker.js'),
      itemSets:
        read('js/ui/itemSets.js')
    };

    assert.equal(
      /innerHTML\s*=\s*`[\s\S]*\$\{alias\}/.test(files.aliases),
      false
    );

    assert.equal(
      /innerHTML\s*=\s*`[\s\S]*\$\{tag\}/.test(files.tags),
      false
    );

    assert.equal(
      /innerHTML\s*=\s*`[\s\S]*page\.title/.test(files.backlinks),
      false
    );

    assert.equal(
      /button\.innerHTML\s*=\s*`[\s\S]*page\.title/.test(files.wikiLinkCreateMenu),
      false
    );

    assert.equal(
      /label\.innerHTML\s*=\s*`[\s\S]*page\.title/.test(files.campaignMapPicker),
      false
    );

    assert.equal(
      /\$\{page\.title\s*\|\|/.test(files.itemSets),
      false
    );

    assert.equal(
      /\$\{getPageShortDescription\(page\)\s*\|\|/.test(files.itemSets),
      false
    );
  }
);


test(
  'world package import preview keeps script-like titles as data only',
  () => {

    const malicious =
      '<img src=x onerror="globalThis.__worldPackageInjected=true">Package';

    globalThis.__worldPackageInjected =
      false;

    const preview =
      createWorldPackageImportPreview({
        packageData: {
          packageId: 'unsafe-package',
          title: malicious,
          contents: {
            pages: [
              {
                id: 'unsafe-page',
                title: malicious,
                body: malicious
              }
            ],
            assets: [],
            rulePackages: []
          },
          dependencies: [
            {
              packageId: 'dependency',
              title: malicious,
              resolved: false
            }
          ]
        },
        existingPages: []
      });

    assert.equal(
      globalThis.__worldPackageInjected,
      false
    );

    assert.equal(
      preview.title,
      malicious
    );

    assert.equal(
      preview.newPages[0].title,
      malicious
    );

    assert.equal(
      read('js/worldPackage/worldPackageModel.js').includes('innerHTML'),
      false
    );

    assert.equal(
      read('js/worldPackage/worldPackageStorage.js').includes('innerHTML'),
      false
    );
  }
);
