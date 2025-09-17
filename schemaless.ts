import type {} from './index.js';

declare module './index.js' {
    export interface VaultExtensionSchema extends Record<string, any> {}

    export interface VaultExtensionTempSchema extends Record<string, any> {}
}
