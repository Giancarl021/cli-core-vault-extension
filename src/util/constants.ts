import { homedir, tmpdir } from 'os';
import type VaultExtensionOptions from '../interfaces/VaultExtensionOptions';

export default {
    temp: {
        root: tmpdir(),
        defaultKey: 'default'
    },
    data: {
        rootPrefix: homedir()
    }
} as const;
