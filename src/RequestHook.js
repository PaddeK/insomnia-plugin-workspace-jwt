const
    {
        HEADER_AUTHORIZATION,
        PLUGIN_NAME,
        STORE_REQUEST_ID_KEY,
        STORE_TOKEN_KEY,
        ENVIRONMENT_DEFAULT_PREFIX,
        ENVIRONMENT_PREFIX_KEY
    } = require('./constants'),
    {buildStoreKey, isTokenExpired, requestFromId} = require('./Utils');

module.exports = async ({request, store, network}) => {
    try {
        const
            workspace = {_id: request.getEnvironment().getMeta().workspaceId},
            tokenKey = buildStoreKey(STORE_TOKEN_KEY, workspace, {_id: request.getEnvironment().getEnvironmentId()}),
            token = await store.getItem(tokenKey),
            authRequestId = await store.getItem(buildStoreKey(STORE_REQUEST_ID_KEY, workspace)),
            hasAuthHeader = request.hasHeader(HEADER_AUTHORIZATION) || Object.keys(request.getAuthentication()).length,
            prefix = request.getEnvironmentVariable(ENVIRONMENT_PREFIX_KEY) ?? ENVIRONMENT_DEFAULT_PREFIX;

        if (authRequestId === null || (request.getId() === authRequestId) || hasAuthHeader) {
            return;
        }

        if (isTokenExpired(token)) {
            await network.sendRequest(requestFromId(authRequestId));
        }

        request.addHeader(HEADER_AUTHORIZATION, `${prefix} ${await store.getItem(tokenKey)}`);
    } catch (err) {
        console.error(PLUGIN_NAME, __filename.slice(0, -3), err);
        throw err;
    }
}
