import { describe, expect, jest, test, afterEach } from '@jest/globals';

import { fs as memfs } from 'memfs';
import hash from '../../src/util/hash.js';

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

const { default: TemporaryDirectory } = await import('../../src/services/TemporaryDirectory.js');

afterEach(() => {
    if (memfs.existsSync('/tmp'))
        memfs.rmSync('/tmp', { recursive: true, force: true });
});

describe('[UNIT] services/TemporaryDirectory', () => {
    test('Should create and remove a temporary directory', async () => {
        expect(memfs.existsSync('/tmp')).toBe(false);
        const tempDir = TemporaryDirectory('/tmp');
        expect(tempDir.getRootPath()).toBe('/tmp');
        expect(tempDir.getWorkspacePath()).toBe('/tmp/default');
        expect(tempDir.getPath('file.txt')).toBe('/tmp/default/file.txt');
        expect(memfs.existsSync('/tmp')).toBe(true);
        expect(memfs.existsSync('/tmp/default')).toBe(true);

        tempDir.destroy();

        expect(memfs.existsSync('/tmp')).toBe(false);
        expect(memfs.existsSync('/tmp/default')).toBe(false);
    });

    test('Should create and remove a named temporary directory', async () => {
        expect(memfs.existsSync('/tmp')).toBe(false);
        const tempDir = TemporaryDirectory('/tmp', 'my-temp-dir');
        expect(tempDir.getRootPath()).toBe('/tmp');
        expect(tempDir.getWorkspacePath()).toBe('/tmp/' + hash('my-temp-dir'));
        expect(tempDir.getPath('file.txt')).toBe('/tmp/' + hash('my-temp-dir') + '/file.txt');
        expect(memfs.existsSync('/tmp')).toBe(true);
        expect(memfs.existsSync('/tmp/' + hash('my-temp-dir'))).toBe(true);

        tempDir.destroy();

        expect(memfs.existsSync('/tmp')).toBe(false);
        expect(memfs.existsSync('/tmp/' + hash('my-temp-dir'))).toBe(false);
    });

    test('Should not throw if temporary directory already exists', async () => {
        memfs.mkdirSync('/tmp', { recursive: true });
        memfs.mkdirSync('/tmp/' + hash('existing-dir'), { recursive: true });

        expect(() => TemporaryDirectory('/tmp', 'existing-dir')).not.toThrow();
        expect(memfs.existsSync('/tmp/' + hash('existing-dir'))).toBe(true);

        const tempDir = TemporaryDirectory('/tmp', 'existing-dir');
        expect(tempDir.getRootPath()).toBe('/tmp');
        expect(tempDir.getWorkspacePath()).toBe('/tmp/' + hash('existing-dir'));
        expect(tempDir.getPath('file.txt')).toBe('/tmp/' + hash('existing-dir') + '/file.txt');

        tempDir.destroy();

        expect(memfs.existsSync('/tmp')).toBe(false);
        expect(memfs.existsSync('/tmp/' + hash('existing-dir'))).toBe(false);
    });

    test('Should create a temporary workspace with a flat structure', async () => {
        expect(memfs.existsSync('/tmp')).toBe(false);
        const tempDir = TemporaryDirectory('/tmp');
        expect(tempDir.getRootPath()).toBe('/tmp');
        expect(tempDir.getWorkspacePath()).toBe('/tmp/default');
        expect(tempDir.getPath('file.txt')).toBe('/tmp/default/file.txt');
        expect(memfs.existsSync('/tmp')).toBe(true);
        expect(memfs.existsSync('/tmp/default')).toBe(true);

        const newWorkspace = tempDir.createTemporaryWorkspace('new-workspace');
        expect(newWorkspace.getRootPath()).toBe('/tmp');
        expect(newWorkspace.getWorkspacePath()).toBe('/tmp/' + hash('new-workspace'));
        expect(newWorkspace.getPath('file.txt')).toBe('/tmp/' + hash('new-workspace') + '/file.txt');
        expect(memfs.existsSync('/tmp/' + hash('new-workspace'))).toBe(true);

        tempDir.destroy();

        expect(memfs.existsSync('/tmp')).toBe(false);
        expect(memfs.existsSync('/tmp/default')).toBe(false);
        expect(memfs.existsSync('/tmp/' + hash('new-workspace'))).toBe(false);
    });

    test('Destroy should be idempotent', async () => {
        expect(memfs.existsSync('/tmp')).toBe(false);
        const tempDir = TemporaryDirectory('/tmp');
        expect(memfs.existsSync('/tmp')).toBe(true);
        expect(memfs.existsSync('/tmp/default')).toBe(true);

        tempDir.destroy();

        expect(memfs.existsSync('/tmp')).toBe(false);
        expect(memfs.existsSync('/tmp/default')).toBe(false);

        // Call destroy again to ensure it does not throw
        expect(() => tempDir.destroy()).not.toThrow();
        expect(memfs.existsSync('/tmp')).toBe(false);
        expect(memfs.existsSync('/tmp/default')).toBe(false);
    });
});