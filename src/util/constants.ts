import { homedir, tmpdir } from 'os';

/**
 * Application constants.
 */
export default {
    workspace: {
        defaultKey: 'default',
        dataPath: 'data.json'
    },
    temp: {
        root: tmpdir()
    },
    data: {
        rootPrefix: homedir()
    }
} as const;
