const
    {PLUGIN_NAME, STORE_FILTER_KEY, STORE_REQUEST_ID_KEY, STORE_TOKEN_KEY} = require('./constants'),
    {applyFilterToResponseBody, buildStoreKey} = require('./Utils');

module.exports = async ({request, response, store}) => {
    try {
        const
            workspace = {_id: request.getEnvironment().getMeta().workspaceId},
            filter = await store.getItem(buildStoreKey(STORE_FILTER_KEY, workspace)),
            authRequestId = await store.getItem(buildStoreKey(STORE_REQUEST_ID_KEY, workspace));

        if (authRequestId === null) {
            return;
        }

        if (response.getRequestId() === authRequestId) {
            const tokenKey = buildStoreKey(STORE_TOKEN_KEY, workspace);
            await store.setItem(tokenKey, applyFilterToResponseBody(response.getBody().toString(), filter));
        }
    } catch (err) {
        console.error(PLUGIN_NAME, __filename.slice(0, -3), err);
        throw err;
    }
}
