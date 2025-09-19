# CLI Core Vault Extension

Vault extension for CLI Core that provides persistent object storage capabilities. It allows the developer to store and retrieve data in a structured manner, using TypeScript Types as Schemas. Using three main storage methods:

- Persistent
- Temporary
- Secret

## Summary

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Command Addons](#commands-addons)
- [Interceptos](#interceptors)
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
        dataPath?: string;
    }
}

const app = CliCore({
    ...options,
    extensions: [VaultExtension()]
});

app.run().catch(console.error);
```

> **Note:** If you do not have a defined schema, or is just propotyping, you can import the

```typescript
import { defineCommand } from '@giancarl021/cli-core';

export default defineCommand(function () {
    this.extensions.vault;
});
```
