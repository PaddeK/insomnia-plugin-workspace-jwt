const {name: PluginName} = require('./../package.json');

module.exports = {
    HEADER_AUTHORIZATION: 'Authorization',
    PLUGIN_NAME: PluginName,
    STORE_REQUEST_ID_KEY: 'requestId',
    STORE_FILTER_KEY: 'filter',
    STORE_TOKEN_KEY: 'token'
}
