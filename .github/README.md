# CLI Core Vault Extension

Vault extension for CLI Core that provides persistent object storage capabilities. It allows the developer to store and retrieve data in a structured manner, using TypeScript Types as Schemas. Using three main storage methods:

- Persistent
- Temporary
- Secret

## Summary

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Secret Storage Modes](#secret-storage-modes)
- [Command Addons](#command-addons)
- [Interceptors](#interceptors)
- [Contributing](#contributing)

## Installation

Go back to [Summary](#summary)

npm:

```bash
# NPM
npm install --save @giancarl021/cli-core-vault-extension
# Yarn
yarn add @giancarl021/cli-core-vault-extension
# PNPM
pnpm add @giancarl021/cli-core-vault-extension
```

## Usage

Go back to [Summary](#summary)

The first step is to configure the extension to be used by the CLI Core application:

```typescript
import CliCore from '@giancarl021/cli-core';
import VaultExtension from '@giancarl021/cli-core-vault-extension';

declare module '@giancarl021/cli-core-vault-extension' {
    // Define your persistent data schema here
    interface VaultExtensionSchema {
        users: { id: number; name: string }[];
        settings: { theme: string; notifications: boolean };
    }

    // If needed, define your temporary data schema here
    interface VaultExtensionTempSchema {
        sessions: { token: string; userId: number }[];
    }
}

const app = CliCore({
    ...options,
    extensions: [VaultExtension()]
});

app.run().catch(console.error);
```

If you do not have a defined schema, or is just propotyping, you can import `@giancarl021/cli-core-vault-extension/schemaless` alongside the main extension:

```typescript
import CliCore from '@giancarl021/cli-core';
import VaultExtension from '@giancarl021/cli-core-vault-extension';
import '@giancarl021/cli-core-vault-extension/schemaless';

const app = CliCore({
    ...options,
    extensions: [VaultExtension()]
});

app.run().catch(console.error);
```

Once the extension is configured, you can access it inside your commands:

```typescript
import { defineCommand } from '@giancarl021/cli-core';

export default defineCommand(async function () {
    this.extensions.vault; // Access the vault extension here
    // There are three main storage methods:
    this.extensions.vault.data; // Persistent storage
    this.extensions.vault.temp; // Temporary storage
    this.extensions.vault.secrets; // Secret storage

    // Example usage:
    // Adding a user to persistent storage
    const users = await this.extensions.vault.data.get('users', []);
    users.push({ id: 1, name: 'John Doe' });
    await this.extensions.vault.data.set('users', users);

    // Adding a session to temporary storage
    const sessions = await this.extensions.vault.temp.get('sessions', []);
    sessions.push({ token: 'abc123', userId: 1 });
    await this.extensions.vault.temp.set('sessions', sessions);

    // Adding a secret
    await this.extensions.vault.secrets.set('apiKey', 'my-secret-api-key');

    // Retrieving data
    const storedUsers = await this.extensions.vault.data.get('users');
    const storedSessions = await this.extensions.vault.temp.get('sessions');
    const apiKey = await this.extensions.vault.secrets.get('apiKey');

    this.logger.json({
        storedUsers,
        storedSessions,
        apiKey
    });

    // Accessing underlying storage instances if needed
    const persistentStorage = this.extensions.vault.data.storage;
    const tempStorage = this.extensions.vault.temp.storage;

    // You can perform low-level operations with these instances if necessary
    const options = persistentStorage.createWorkspace('options'); // Create a new workspace for options

    await writeFile(
        options.getWorkspacePath(),
        JSON.stringify({ debug: true }, null, 2)
    );

    return this.NO_OUTPUT;
});
```

## Options

Go back to [Summary](#summary)

The Vault extension accepts the following options:

|               Option                |                                    Type                                     | Description                                                                                                                                                                                      |      Default value      |
| :---------------------------------: | :-------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------: |
|        `lazyInitialization`         |                                  `boolean`                                  | If `true`, the storage directories will be created only when accessed for the first time. Otherwise will create as soon as the extension is initialized                                          |         `true`          |
|             `dataPath`              |                                  `string`                                   | Custom path for storing persistent data. If not provided, defaults to a `.<app-name>` directory in the user's home directory.                                                                    |  `<home>/.<app-name>`   |
|             `tempPath`              |                                  `string`                                   | Custom path for storing temporary data. If not provided, defaults to a `.<app-name>` directory in the OS's temporary directory.                                                                  | `<os-temp>/.<app-name>` |
|            `initialData`            |     [`VaultExtensionSchema`](../src/interfaces/VaultExtensionSchema.ts)     | Initial data to populate the persistent storage if the storage file does not exist.                                                                                                              |          `{}`           |
|          `tempInitialData`          | [`VaultExtensionTempSchema`](../src/interfaces/VaultExtensionTempSchema.ts) | Initial data to populate the temporary storage if the storage file does not exist.                                                                                                               |          `{}`           |
|         `destroyTempOnExit`         |                                  `boolean`                                  | If `true`, the temporary storage directory will be deleted when the application exits.                                                                                                           |         `true`          |
|        `secretStorage.mode`         |                      `'auto' \| 'keychain' \| 'file'`                       | Mode of secret storage. See [Secret Storage Modes](#secret-storage-modes) for more details.                                                                                                      |        `'auto'`         |
| `secretStorage.encryptionKeyEnvVar` |                                  `string`                                   | Name of the environment variable that contains the encryption key for file-based secret storage. Only used if `secretStorage.mode` is set to `'file'` or `'auto'` and keychain is not available. | `'CLI_CORE_VAULT_KEY'`  |

## Secret Storage Modes

Go back to [Summary](#summary)

The Vault extension provides three modes for secret storage:

- `keychain`: Uses the operating system's secure storage mechanisms (e.g., Keychain on macOS, Credential Locker on Windows, Secret Service on Linux). This is the most secure option but may not be available on all systems.
- `filesystem`: Uses an encrypted file to store secrets. The encryption key must be provided through an environment variable (default is `CLI_CORE_VAULT_KEY`). This option is less secure than using the OS's secure storage but is more widely compatible.
- `auto`: Automatically selects the best available option. It will use the OS's secure storage if available; otherwise, it will fall back to file-based storage.

## Command Addons

Go back to [Summary](#summary)

The Vault extension adds the following properties to the command context:

```typescript
// Accessible through this.extensions.vault inside a command

export default interface VaultExtensionAddons {
    data: {
        get(prop: string, defaultValue?: unknown): Promise<unknown | undefined>;
        set(prop: string, value: unknown): Promise<void>;
        remove(prop: string): Promise<void>;
        listKeys(): Promise<string[]>;
        storage: {
            writeObject(relativePath: string, obj: unknown): Promise<void>;
            readObject(relativePath: string): Promise<unknown>;
            removeObject(relativePath: string): Promise<void>;
            destroy(): Promise<void>;
            getRootPath(): string;
            getWorkspacePath(): string;
            getPath(relativePath: string): string;
            createWorkspace<WorkspaceSchema>(name: string): typeof storage;
            destroyWorkspace(): Promise<void>;
        };
    };
    // Same methods as `data`, but for temporary storage
    temp: {
        ...typeof data;
    }
    secrets: {
        get(key: string): Promise<string | undefined>;
        set(key: string, value: string): Promise<void>;
        remove(key: string): Promise<void>;
    };
}
```

> **Important:** The complexity of the types shown here is reduced for clarity. For the complete types, please refer to the [`VaultExtensionAddons`](../src/interfaces/VaultExtensionAddons.ts) type.

It is noticeable that both `data` and `temp` have the same methods. The difference is that `data` is persistent storage, while `temp` is temporary storage that can be cleared or destroyed without affecting the persistent data.

The `secrets` property, on the other hand, provides methods to securely store, retrieve, and remove sensitive information using the underlying OS's secure storage mechanisms, if available. If not available, it falls back to a encrypted file using the `CLI_CORE_VAULT_KEY` environment variable as the encryption key. If the environment variable is not set, it will throw an error at the start of the application.

## Interceptors

Go back to [Summary](#summary)

The Vault extension add a single interceptor at the `beforeEnding` stage to handle the cleanup of the temporary storage if the `destroyTempOnExit` option is set to `true`.

## Contributing

Go back to [Summary](#summary)

Contributions are welcome! Please open an issue or a pull request on GitHub.

Currently the code is 100% covered by tests, so please make sure to add tests for any new functionality.
