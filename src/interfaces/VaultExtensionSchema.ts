/**
 * This file defines the schema interfaces for the Vault Extension.
 * It can be extended in the host application to define the structure of data to be stored.
 *
 * @example
 * ```ts
 * // Extending the VaultExtensionSchema in the host application
 * import type {} from '@giancarl021/cli-core-vault-extension';
 *
 * declare module '@giancarl021/cli-core-vault-extension' {
 *    export interface VaultExtensionSchema {
 *      users: { id: string; name: string }[];
 *      settings: { theme: string; notifications: boolean };
 *   }
 * }
 * ```
 */
export interface VaultExtensionSchema {}

/**
 * This interface defines the schema for temporary data storage in the Vault Extension.
 * It can be extended in the host application to define the structure of temporary data.
 *
 * @example
 * ```ts
 * // Extending the VaultExtensionTempSchema in the host application
 * import type {} from '@giancarl021/cli-core-vault-extension';
 *
 * declare module '@giancarl021/cli-core-vault-extension' {
 *    export interface VaultExtensionTempSchema {
 *      session: { token: string; expiresAt: string };
 *      cache: { [key: string]: any };
 *   }
 * }
 * ```
 */
export interface VaultExtensionTempSchema {}
