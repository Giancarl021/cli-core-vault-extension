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
    temp: {
        root: tmpdir()
    },
    data: {
        rootPrefix: homedir()
    }
} as const;
