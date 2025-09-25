import {
    describe,
    expect,
    jest,
    test,
    afterEach,
    afterAll,
    beforeEach
} from '@jest/globals';

let currentPlatform: string = 'linux';
let shouldSuceedOnScriptTest = true;
let tmpEnv: NodeJS.ProcessEnv;

jest.unstable_mockModule('child_process', () => ({
    execSync: () => {
        if (!shouldSuceedOnScriptTest)
            throw new Error('Simulated command failure');

        let result: string;

        switch (currentPlatform) {
            case 'darwin':
                result = 'login.keychain';
                break;
            case 'linux':
                result = 'org.freedesktop.secrets';
                break;
            case 'win32':
                result = 'DPAPI';
                break;
            default:
                result = 'login';
                break;
        }

        return Buffer.from(result, 'utf8');
    }
}));

jest.unstable_mockModule('os', () => ({
    platform() {
        return currentPlatform;
    }
}));

beforeEach(() => {
    tmpEnv = { ...process.env };
    delete process.env.DBUS_SESSION_BUS_ADDRESS;
})

afterEach(() => {
    jest.clearAllMocks();
    shouldSuceedOnScriptTest = true;
    process.env = { ...tmpEnv };
});

afterAll(() => {
    jest.restoreAllMocks();
});

const { default: hasStableKeychain } = await import(
    '../../src/util/hasStableKeychain.js'
);

describe('[UNIT] util/hasStableKeychain', () => {
    test('Should return true for Windows platform without further testing', () => {
        currentPlatform = 'win32';
        expect(hasStableKeychain()).toBe(true);
    });

    test('Should return true for macOS platform with login keychain', () => {
        currentPlatform = 'darwin';
        expect(hasStableKeychain()).toBe(true);
    });

    test('Should return false for macOS platform without login keychain', () => {
        currentPlatform = 'darwin';
        shouldSuceedOnScriptTest = false;
        expect(hasStableKeychain()).toBe(false);
    });

    test('Should return true for Linux platform with Secret Service API', () => {
        currentPlatform = 'linux';
        process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';
        expect(hasStableKeychain()).toBe(true);
    });

    test('Should return false for Linux platform without Secret Service API', () => {
        currentPlatform = 'linux';
        expect(hasStableKeychain()).toBe(false);
    });

    test('Should return false for Linux platform with DBUS but without Secret Service API', () => {
        currentPlatform = 'linux';
        process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';
        shouldSuceedOnScriptTest = false;
        expect(hasStableKeychain()).toBe(false);
    });

    test('Should return false for unknown platform', () => {
        currentPlatform = 'unknown';
        expect(hasStableKeychain()).toBe(false);
    });
});
