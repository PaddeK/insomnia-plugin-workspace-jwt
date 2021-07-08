const
    {EOL} = require('os'),
    {readFileSync} = require('fs'),
    jq = require('jsonpath'),
    iconv = require('iconv-lite'),
    {query: queryXPath} = require('insomnia-xpath'),
    {PLUGIN_NAME, STORE_FILTER_KEY, STORE_TOKEN_KEY} = require('./constants');

class Utils
{
    /**
     * @param {string} _id
     * @return {{_id}}
     */
    static requestFromId (_id)
    {
        return {_id};
    }

    /**
     * @param {string} str
     * @param {number} size
     * @return {string[]}
     */
    static chunkString(str, size)
    {
        const
            numChunks = Math.ceil(str.length / size),
            chunks = new Array(numChunks);

        for (let i = 0, j = 0; i < numChunks; ++i, j += size) {
            chunks[i] = str.substr(j, size);
        }

        return chunks;
    }

    /**
     * @param {{sendRequest: function}} network
     * @param {object|string} request
     * @param {string} filter
     * @return {Promise<string>}
     */
    static async getResponse (network, request, filter)
    {
        filter = filter.trim();
        request = typeof request === 'string' ? Utils.requestFromId(request) : request;

        const response = await network.sendRequest(request);

        if (!response) {
            throw new Error(`[${PLUGIN_NAME}] No responses for request`);
        }

        if (response.error) {
            throw new Error(`[${PLUGIN_NAME}] Failed to send dependent request ${response.error}`);
        }

        if (!response.statusCode) {
            throw new Error(`[${PLUGIN_NAME}] No successful responses for request`);
        }

        const
            bodyBuffer = readFileSync(response.bodyPath),
            match = response.contentType && response.contentType.match(/charset=([\w-]+)/),
            charset = match && match.length >= 2 ? match[1] : 'utf-8';
        let body;

        try {
            body = iconv.decode(bodyBuffer, charset);
        } catch (err) {
            body = bodyBuffer.toString();
            console.warn(`[${PLUGIN_NAME}] Failed to decode body`, err);
        }

        return Utils.applyFilterToResponseBody(body, filter);
    }

    /**
     * @param {string} body
     * @param {string} filter
     * @return {string}
     */
    static applyFilterToResponseBody (body, filter)
    {
        return filter.startsWith('$') ? Utils.matchJSONPath(body, filter) : Utils.matchXPath(body, filter);
    }

    /**
     * @param {{prompt: function}} app
     * @param {string[]} elements
     * @param {number} chunkSize
     * @param {string} title
     * @param {string} hint
     * @return {Promise<boolean>}
     */
    static async hackSelect (app, elements, {chunkSize = 15, title = '', hint = ''})
    {
        let found = false;
        const pages = Math.ceil(elements.length / chunkSize);

        for (let pos = 0, page = 1; pos <= elements.length - 1 && found === false; pos += chunkSize, page++) {
            const
                hints = elements.slice(pos, pos + chunkSize),
                last = hints.length < chunkSize || pos === elements.length - 1;

            await app.prompt(title, {
                hint: `${hint}${'\u2002'.repeat(20)} Page ${page}/${pages}`,
                hints,
                inputType: 'hidden',
                submitName: last ? 'Done' : 'Next',
                onDeleteHint: req => {
                    found = req;
                }
            });
        }

        return found;
    }

    /**
     * @param {object} data
     * @param {string} modelId
     * @return {string}
     */
    static buildModelName (data, modelId) {
        const
            hierarchy = Object.values(data).reduce((result, modelType) => {
                (Array.isArray(modelType) ? modelType : [modelType]).forEach(model => {
                    result[model._id] = {parentId: model.parentId, type: model.type, name: model.name};
                });
                return result;
            }, {}),
            parts = (id, name = []) => {
                const model = hierarchy[id];

                if (!model) {
                    return '';
                }

                if (model.type === 'Workspace') {
                    return [model.name].concat(name);
                }

                return parts(model.parentId, [model.name].concat(name));
            },
            [ws, ...rest] = parts(modelId);

        return `${ws}${rest.length ? ' - ' : ''}${rest.join('/').replace(/^\//g, '').replace(/\/+/g, '/')}`;
    }

    /**
     * @param {{prompt: function}} app
     * @param {{workspace: object, requestGroups: object[], requests: object[]}} models
     * @param {string} model
     * @param {number} chunkSize
     * @param {string} title
     * @param {string} hint
     * @return {Promise<string>}
     */
    static async modelHackSelect (app, models, model, {chunkSize = 15, title = '', hint = ''})
    {
        try {
            const
                getDisplayName = Utils.buildModelName.bind(null, models),
                resultMap = {},
                mapper = model => {
                    const displayName = getDisplayName(model._id);
                    resultMap[displayName] = model._id;
                    return displayName;
                },
                result = await Utils.hackSelect(app, models[model].map(mapper), {title, hint, chunkSize});

            return result ? resultMap[result] : '';
        } catch (err) {
            return '';
        }
    }

    /**
     * @param {string} token
     * @return {boolean}
     */
    static isTokenExpired (token)
    {
        try {
            const
                [, payload] = token.split('.'),
                rawPayload = Buffer.from(payload, 'base64').toString('utf8'),
                {exp} = JSON.parse(rawPayload);

            return exp === undefined ? false : exp <= ~~(Date.now() / 1000);
        } catch (err) {
            return true;
        }
    }

    /**
     * @param {string} bodyStr
     * @param {string} query
     * @return {string}
     */
    static matchJSONPath (bodyStr, query)
    {
        let body, results;

        try {
            body = JSON.parse(bodyStr);
        } catch (err) {
            throw new Error(`[${PLUGIN_NAME}] Invalid JSON: ${err.message}`);
        }

        try {
            results = jq.query(body, query);
        } catch (err) {
            throw new Error(`[${PLUGIN_NAME}] Invalid JSONPath query: ${query}`);
        }

        if (results.length === 0) {
            throw new Error(`[${PLUGIN_NAME}] Returned no results: ${query}`);
        } else if (results.length > 1) {
            throw new Error(`[${PLUGIN_NAME}] Returned more than one result: ${query}`);
        }

        return typeof results[0] !== 'string' ? JSON.stringify(results[0]) : results[0];
    }

    /**
     * @param {string} bodyStr
     * @param {string} query
     * @return {string}
     */
    static matchXPath (bodyStr, query)
    {
        const results = queryXPath(bodyStr, query);

        if (results.length === 0) {
            throw new Error(`[${PLUGIN_NAME}] Returned no results: ${query}`);
        } else if (results.length > 1) {
            throw new Error(`[${PLUGIN_NAME}] Returned more than one result: ${query}`);
        }

        return results[0].inner;
    }

    /**
     * @param {object|string} request
     * @param {string} filter
     * @param {{sendRequest: function}} network
     * @param {{setItem: function}} store
     * @param {{_id: string}} workspace
     * @return {Promise<string|null>}
     */
    static async handleTokenResponse (request, filter, {network, store, workspace})
    {
        try {
            const response = await Utils.getResponse(network, request, filter);

            if (response) {
                await store.setItem(Utils.buildStoreKey(STORE_TOKEN_KEY, workspace), response);
                return response;
            }

            return null;
        } catch (err) {
            console.error(`[${PLUGIN_NAME}] handleTokenResponse: ${err}`)
            return null;
        }
    }

    /**
     * @param {{prompt: function}} app
     * @param {{setItem: function}} store
     * @param {{_id: string}} workspace
     * @return {Promise<string|null>}
     */
    static async promptForFilter (app, store, workspace)
    {
        try {
            const filter = await app.prompt('Enter Filter (JSONPath or XPath)', {label: 'Filter', submitName: 'Done'});

            if (filter) {
                await store.setItem(Utils.buildStoreKey(STORE_FILTER_KEY, workspace), filter);
                return filter;
            }

            return null;
        } catch (err) {
            console.error(`[${PLUGIN_NAME}] promptForFilter: ${err}`)
            return null;
        }
    }

    /**
     * @param {string} token
     * @param {{alert: function}} app
     * @return {Promise<void>}
     */
    static async displayToken (token, app)
    {
        await app.alert('Received token', Utils.chunkString(token, 40).join(EOL));
    }

    /**
     * @param {string} key
     * @param {{_id: string}} workspace
     * @return {string}
     */
    static buildStoreKey (key, workspace)
    {
        return `${workspace._id}:${key}`;
    }

    /**
     * @param {{export: {insomnia: function}}} data
     * @param {string} modelId
     * @return {Promise<string>}
     */
    static async findWorkspace (data, modelId)
    {
        const
            rawData = JSON.parse(await data.export.insomnia({includePrivate: false, format: 'json'})),
            hierarchy = rawData.resources.reduce((p, c) => (p[c._id] = c.parentId, p), {}),
            _findWorkspace = id => hierarchy[id] === null ? id : _findWorkspace(hierarchy[id]);

        return _findWorkspace(modelId);
    }
}

module.exports = Utils;
