import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INTERNAL_RULES_WORKSPACE_ENTRIES
} from '../js/rulesWorkspace/rulesWorkspaceSeed.js';

import {
  createInternalRulePage,
  findInternalRuleByPageId,
  findInternalRuleByTitleOrAlias,
  getInternalRuleChildren,
  getInternalRuleEntries,
  getInternalRulesWorkspaceMeta,
  loadInternalRulesWorkspaceContent,
  setInternalRulesWorkspaceContent
} from '../js/rulesWorkspace/rulesWorkspaceIndex.js';


test(
  'internal rules workspace exposes admin seed and lookup',
  () => {

    const meta =
      getInternalRulesWorkspaceMeta();

    assert.equal(
      meta.kind,
      'InternalRulesWorkspace'
    );

    assert.equal(
      meta.owner,
      'admin'
    );

    assert.ok(
      meta.entries >= 10
    );

    const rule =
      findInternalRuleByTitleOrAlias(
        'КЗ'
      );

    assert.equal(
      rule.id,
      'armor-class'
    );

    assert.equal(
      getInternalRuleChildren(
        'dnd-core'
      ).length > 0,
      true
    );

    assert.equal(
      getInternalRuleEntries()
        .some(entry => entry.title === 'Хиты'),
      true
    );
  }
);


test(
  'internal rules workspace can load program-owned content file',
  async () => {

    await loadInternalRulesWorkspaceContent({
      url:
        '/virtual/internal-rules.json',
      fetcher:
        async () => ({
          ok:
            true,
          json:
            async () => ({
              kind:
                'InternalRulesWorkspace',
              version:
                2,
              owner:
                'admin',
              rootId:
                'internal-rules-root',
              updatedAt:
                '2026-06-15',
              entries: [
                {
                  id:
                    'test-rule',
                  parentId:
                    null,
                  title:
                    'Тестовое правило',
                  aliases: [
                    'TR'
                  ],
                  summary:
                    'Проверка файлового content layer.',
                  body:
                    'Контент пришел из program-owned файла.',
                  tags: [
                    'test'
                  ]
                }
              ]
            })
        })
    });

    const meta =
      getInternalRulesWorkspaceMeta();

    assert.equal(
      meta.source,
      'programFile'
    );

    assert.equal(
      meta.version,
      2
    );

    assert.equal(
      findInternalRuleByTitleOrAlias(
        'TR'
      ).id,
      'test-rule'
    );

    setInternalRulesWorkspaceContent({
      kind:
        'InternalRulesWorkspace',
      version:
        1,
      owner:
        'admin',
      rootId:
        'internal-rules-root',
      source:
        'testReset',
      entries:
        INTERNAL_RULES_WORKSPACE_ENTRIES
    });
  }
);


test.after(
  () => {

    setInternalRulesWorkspaceContent({
      kind:
        'InternalRulesWorkspace',
      version:
        1,
      owner:
        'admin',
      rootId:
        'internal-rules-root',
      source:
        'testReset',
      entries:
        INTERNAL_RULES_WORKSPACE_ENTRIES
    });
  }
);


test(
  'internal rule entry can be represented as read-only page-like object',
  () => {

    const page =
      createInternalRulePage(
        findInternalRuleByTitleOrAlias(
          'Бонус мастерства'
        )
      );

    assert.equal(
      page.template,
      'internalRule'
    );

    assert.equal(
      page.readOnly,
      true
    );

    assert.match(
      page.content,
      /data-internal-rule-id="proficiency-bonus"/
    );

    assert.equal(
      findInternalRuleByPageId(
        page.id
      ).id,
      'proficiency-bonus'
    );
  }
);
