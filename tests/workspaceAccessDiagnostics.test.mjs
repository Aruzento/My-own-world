import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyWorkspaceLocation,
  collectWorkspaceAccessDiagnostics,
  normalizeWorkspaceAccessError
} from '../js/storage/workspaceAccessDiagnostics.js';


test(
  'workspace access diagnostics classifies another disk outside HOME',
  () => {

    const location =
      classifyWorkspaceLocation(
        'X:/ДНД/Мастер/База',
        {
          homePath:
            'C:/Users/Aruko',
          platform:
            'win32'
        }
      );

    assert.equal(
      location.isDifferentDrive,
      true
    );

    assert.equal(
      location.isOutsideHome,
      true
    );

    assert.equal(
      location.isPossibleExternalDrive,
      true
    );

    assert.match(
      location.summary,
      /different drive/
    );
  }
);


test(
  'workspace access diagnostics classifies network workspace',
  () => {

    const location =
      classifyWorkspaceLocation(
        '\\\\server\\share\\world',
        {
          homePath:
            'C:/Users/Aruko',
          platform:
            'win32'
        }
      );

    assert.equal(
      location.isNetwork,
      true
    );

    assert.equal(
      location.isOutsideHome,
      true
    );
  }
);


test(
  'workspace access diagnostics reports successful write probe',
  async () => {

    const adapter =
      createMemoryAdapter();

    const diagnostics =
      await collectWorkspaceAccessDiagnostics({
        storageAdapter:
          adapter,
        workspacePath:
          'C:/Users/Aruko/World',
        homePath:
          'C:/Users/Aruko',
        platform:
          'win32',
        hasWorkspace:
          true,
        canWriteWorkspace:
          true,
        writeProbe:
          true
      });

    assert.equal(
      diagnostics.canWrite,
      true
    );

    assert.equal(
      diagnostics.writeProbe.ok,
      true
    );

    assert.equal(
      adapter.files.size,
      0
    );

    assert.equal(
      diagnostics.matrix.find(row =>
        row.id === 'read-only'
      ).status,
      'ok'
    );
  }
);


test(
  'workspace access diagnostics explains read-only write failure',
  async () => {

    const adapter =
      createMemoryAdapter({
        writeError:
          Object.assign(
            new Error('Access denied'),
            {
              code:
                'desktop.permission_denied',
              path:
                '.my-own-world-write-probe.tmp'
            }
          )
      });

    const diagnostics =
      await collectWorkspaceAccessDiagnostics({
        storageAdapter:
          adapter,
        workspacePath:
          'D:/Campaign',
        homePath:
          'C:/Users/Aruko',
        platform:
          'win32',
        hasWorkspace:
          true,
        canWriteWorkspace:
          true,
        writeProbe:
          true
      });

    assert.equal(
      diagnostics.canWrite,
      false
    );

    assert.equal(
      diagnostics.writeProbe.code,
      'desktop.permission_denied'
    );

    assert.equal(
      diagnostics.writeProbe.message,
      'No write permission for this workspace.'
    );

    assert.equal(
      diagnostics.matrix.find(row =>
        row.id === 'read-only'
      ).status,
      'blocked'
    );
  }
);


test(
  'workspace access diagnostics normalizes disk disconnect style errors',
  () => {

    const error =
      normalizeWorkspaceAccessError(
        Object.assign(
          new Error('ENOENT: no such file or directory'),
          {
            code:
              'ENOENT',
            path:
              'E:/World/pages'
          }
        )
      );

    assert.equal(
      error.userMessage,
      'File or folder was not found. The disk may be disconnected or the path changed.'
    );
  }
);


function createMemoryAdapter(
  options = {}
) {

  const files =
    new Map();

  return {
    kind:
      'desktop',

    files,

    getWorkspaceRoot() {

      return 'memory-workspace';
    },

    async pickWorkspace() {

      return 'memory-workspace';
    },

    async restoreWorkspace() {

      return 'memory-workspace';
    },

    async ensureDirectory() {},

    async getDirectoryHandle() {

      return {};
    },

    async readText(
      path
    ) {

      if (!files.has(path)) {

        throw new Error(
          `File not found: ${path}`
        );
      }

      return files.get(
        path
      );
    },

    async writeText(
      path,
      content
    ) {

      if (options.writeError) {

        throw options.writeError;
      }

      files.set(
        path,
        String(content)
      );
    },

    async readBinary() {

      return new ArrayBuffer(0);
    },

    async writeBinary() {},

    async listFiles() {

      return [];
    },

    async removeFile(
      path
    ) {

      files.delete(
        path
      );
    },

    async removeDirectory() {}
  };
}
