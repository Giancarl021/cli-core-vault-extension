const VaultExtension = require('./index');
const fs = require('fs');
const keytar = require('keytar');
const { deepStrictEqual } = require('assert');

const sampleThis = {
    appName: 'test',
    context: {},
    helpers: {
        hasFlag(a, ...b) { return true; },
        getFlag(a, ...b) { return true; },
        whichFlag(a, ...b) { return a; },
        getArgAt(n) { return 'arg1'; },
        hasArgAt(n) { return true; },
        cloneArgs() { return [ 'arg1' ]; },
        valueOrDefault(n, d) { return n ?? d; }
    }
};

const extension = VaultExtension({ dataPath: 'data/test.json', baseData: { example: 1 } });

const callbacks = extension.builder();

async function main() {
    const serviceName = `${sampleThis.appName}::vault`;

    bindThis(callbacks, sampleThis);

    await callbacks.setSecret('test1', 'password1');
    const test1 = await callbacks.getSecret('test1');
    const test1Keytar = await keytar.getPassword(serviceName, 'test1');

    deepStrictEqual(test1, test1Keytar);
    deepStrictEqual(test1, 'password1');

    await callbacks.removeSecret('test1');
    const test1Removed = await callbacks.getSecret('test1');
    const test1RemovedKeytar = await keytar.getPassword(serviceName, 'test1');

    deepStrictEqual(test1Removed, test1RemovedKeytar);
    deepStrictEqual(test1Removed, null);

    const test2 = callbacks.getData('example');
    deepStrictEqual(test2, 1);
    deepStrictEqual(getData(), { example: 1 });

    callbacks.setData('anotherExample', 2);
    const test3 = callbacks.getData('anotherExample');

    deepStrictEqual(test3, 2);
    deepStrictEqual(getData(), { example: 1, anotherExample: 2 });

    callbacks.removeData('anotherExample');
    const test4 = callbacks.getData('anotherExample');

    deepStrictEqual(test4, undefined);
    deepStrictEqual(getData(), { example: 1 });
}

function bindThis(callbacks, sampleThis) {
    for (const cb in callbacks) {
        callbacks[cb] = callbacks[cb].bind(sampleThis);
    }
}

function getData() {
    const data = fs.readFileSync('data/test.json', 'utf8');

    return JSON.parse(data);
}

main()
    .then(() =>  console.log('✅ All tests passed!'))
    .catch(err => {
        console.log('❎ Tests failed!');
        console.error(err.message);
    });