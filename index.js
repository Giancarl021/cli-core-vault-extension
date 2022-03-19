const fs = require('fs');
const path = require('path');
const objPath = require('object-path');
const keytar = require('keytar');
const locate = require('@giancarl021/locate');

const EXTENSION_NAME = 'vault';
const SERVICE_SUFFIX = '::vault';

module.exports = function ({ dataPath = 'data/extensions/vault/data.json', baseData = {} } = {}) {
    const _path = locate(dataPath);

    function builder() {
        async function setSecret(key, value) {
            await keytar.setPassword(this.appName + SERVICE_SUFFIX, key, value);
        }

        async function getSecret(key) {
            return await keytar.getPassword(this.appName + SERVICE_SUFFIX, key);
        }

        async function removeSecret(key) {
            const isSuccess = await keytar.deletePassword(this.appName + SERVICE_SUFFIX, key);

            if (!isSuccess) throw new Error('Failed to remove secret');
        }

        function checkDataStorage() {
            if (fs.existsSync(_path) && fs.lstatSync(_path).isFile()) return;

            const dir = path.dirname(_path);

            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            _setData(baseData);
        }

        function _getData() {
            checkDataStorage();

            const data = fs.readFileSync(_path, 'utf8');

            return JSON.parse(data);
        }

        function _setData(data) {
            fs.writeFileSync(_path, JSON.stringify(data));
        }

        function setData(key, value) {
            const data = _getData();

            objPath.set(data, key, value);

            _setData(data);
        }

        function getData(key) {
            const data = _getData();

            return objPath.get(data, key);
        }

        function removeData(key) {
            const data = _getData();

            objPath.del(data, key);

            _setData(data);
        }

        return {
            setSecret,
            getSecret,
            removeSecret,
            setData,
            getData,
            removeData
        };
    }

    return {
        name: EXTENSION_NAME,
        builder
    };
}