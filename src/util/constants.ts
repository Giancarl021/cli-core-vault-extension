import { homedir, tmpdir } from 'os';

/**
 * Application constants.
 */
export default {
    workspace: {
        defaultKey: 'default',
        dataPath: 'data.json',
        secretPath: 'secrets.enc'
    },
    filesystemSecretStorage: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 12,
        tagLength: 16,
        sizeLength: 16
    },
    temp: {
        root: tmpdir()
    },
    data: {
        rootPrefix: homedir()
    }
} as const;
