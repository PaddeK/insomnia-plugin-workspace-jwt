const
    {PLUGIN_NAME, STORE_REQUEST_ID_KEY} = require('./constants'),
    {buildStoreKey, displayToken, handleTokenResponse, promptForFilter, modelHackSelect} = require('./Utils');

module.exports = [
    {
        label: 'Set Workspace JWT',
        icon: 'fa fa-unlock',
        action: async ({app, network, store}, models) => {
            try {
                const
                    {workspace} = models,
                    title = 'Select authorization request',
                    hint = 'Delete hint to select request. Press next to go to next page.',
                    chunkSize = 10,
                    reqId = await modelHackSelect(app, models, 'requests', {title, hint, chunkSize});

                if (reqId) {
                    await store.setItem(buildStoreKey(STORE_REQUEST_ID_KEY, workspace), reqId);

                    const filter = await promptForFilter(app, store, workspace);

                    if (filter) {
                        const response = await handleTokenResponse(reqId, filter, {network, store, workspace});
                        await displayToken(response, app);
                    }
                }
            } catch (err) {
                console.error(PLUGIN_NAME, __filename.slice(0, -3), err);
                throw err;
            }
        }
    },
    {
        label: 'Clear Workspace JWT data',
        icon: 'fa fa-trash',
        action: async ({app, store}, models) => {
            const
                {workspace} = models,
                searchPrefix = `${workspace._id}:`,
                storeData = await store.all();

            try {
                await app.prompt('Clear Workspace JWT', {
                    label: 'This will delete all Workspace JWT data for this workspace. Are you sure?',
                    inputType: 'hidden',
                    submitName: 'I\'am Sure',
                    hint: 'Close this prompt to cancel'
                });

                for await (let {key} of storeData) {
                    key.startsWith(searchPrefix) && await store.removeItem(key);
                }
            } catch (err) {
                console.error(PLUGIN_NAME, __filename.slice(0, -3), err);
            }
        }
    }
];
