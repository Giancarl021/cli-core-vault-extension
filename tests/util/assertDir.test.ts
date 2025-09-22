import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { fs as memfs } from 'memfs';

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

const { default: assertDir } = await import('../../src/util/assertDir.js');

afterEach(() => {
    if (memfs.existsSync('/testDir'))
        memfs.rmSync('/testDir', { recursive: true, force: true });
});

describe('[UNIT] util/assertDir', () => {
    test('Should create directory if it does not exist', () => {
        expect(memfs.existsSync('/testDir')).toBe(false);
        assertDir('/testDir');
        expect(memfs.existsSync('/testDir')).toBe(true);
        expect(memfs.lstatSync('/testDir').isDirectory()).toBe(true);
    });

    test('Should not throw if directory already exists', () => {
        memfs.mkdirSync('/testDir');
        expect(memfs.existsSync('/testDir')).toBe(true);
        expect(() => assertDir('/testDir')).not.toThrow();
    });

    test('Should throw if path exists but is not a directory', () => {
        memfs.writeFileSync('/testDir', 'I am a file, not a directory!');
        expect(memfs.existsSync('/testDir')).toBe(true);
        expect(() => assertDir('/testDir')).toThrow(
            /^Path exists and is not a directory: .*$/
        );
    });
});
