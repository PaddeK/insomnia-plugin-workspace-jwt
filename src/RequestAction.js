const
    {PLUGIN_NAME, STORE_REQUEST_ID_KEY} = require('./constants'),
    {buildStoreKey, displayToken, findWorkspace, handleTokenResponse, promptForFilter} = require('./Utils');

module.exports = {
    label: "Use as Authorization request",
    icon: 'fa-key',
    action: async ({app, data, network, store}, {request}) => {
        try {
            const workspaceId = await findWorkspace(data, request._id);

            if (workspaceId !== null) {
                const workspace = {_id: workspaceId};

                await store.setItem(buildStoreKey(STORE_REQUEST_ID_KEY, workspace), request._id);

                const filter = await promptForFilter(app, store, workspace);

                if (filter) {
                    const response = await handleTokenResponse(request, filter, {network, store, workspace});
                    await displayToken(response, app);
                }
            }
        } catch (err) {
            console.error(PLUGIN_NAME, __filename.slice(0, -3), err);
            throw err;
        }
    }
}
