import { homedir, tmpdir } from 'os';

/**
 * Application constants.
 */
export default {
    temp: {
        root: tmpdir(),
        defaultKey: 'default'
    },
    data: {
        rootPrefix: homedir()
    }
} as const;
