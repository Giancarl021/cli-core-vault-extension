# cli-core-vault-extension

Plain and secure storage extension for the @giancarl021/cli-core npm package

## Installation

npm:
```bash
npm install @giancarl021/cli-core-vault-extension
```

Yarn:
```bash
yarn add @giancarl021/cli-core-vault-extension
```

## Usage

To use this extension, you first need the [`@giancarl021/cli-core` npm package](https://www.npmjs.com/package/@giancarl021/cli-core) installed.
### Applying the extension

To apply the extension to your cli-core runner, first import the module:

```javascript
const cliCore = require('@giancarl021/cli-core');
const CliCoreVaultExtension = require('@giancarl021/cli-core-vault-extension');

const runner = cliCore(appName, {
    extensions: [ CliCoreVaultExtension(options /* optional */) ],
    ...options
});
```

This will make the extension methods available on each command bound to this runner.

The extension have optional options with the following shape:

```javascript
const options = {
    baseData: {} // The initial state of the stored data
    dataPath: 'data/extensions/vault/data.json' // The path to the data file, relative paths will be resolved from the project root
};
```

### Using the methods on commands

The extension allows you to use the following methods on each command:

```javascript
const myCommand = function (args, flags) {
    // Get a stored value
    const myValue = this.extensions.vault.getData('myKey');
    // Set a stored value
    this.extensions.vault.setData('myKey', 'myValue');
    // Remove a stored value
    this.extensions.vault.removeData('myKey');

    // Get a secret
    const mySecret = this.extensions.vault.getSecret('myKey');
    // Set a secret
    this.extensions.vault.setSecret('myKey', 'myValue');
    // Remove a secret
    this.extensions.vault.removeSecret('myKey');
}
```

## Tests

If you want to test the library, you can run the tests by running the following commands on the root of the project:

npm:
```bash
npm install
npm test
```

Yarn:
```bash
yarn
yarn test
```