const {
    WorkspaceActions,
    RequestAction,
    RequestHook,
    ResponseHook
} = require('./src');

module.exports.workspaceActions = WorkspaceActions;
module.exports.requestActions = [RequestAction];
module.exports.requestHooks = [RequestHook];
module.exports.responseHooks = [ResponseHook];
