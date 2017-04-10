"use strict";

var _ = require("underscore");
var ActionTypes = require("../action/apiKeyAction.js").Types;

var validateApiKey = function (key) {
    return typeof key === "string" && key.length > 0;
};

var initialState = {
    key: "",  // the API key
    currentApiKey: "",
    isApiKeySaved: false,
    isApiKeyValid: false,
    isMapsApiLoaded: false
};
initialState.isApiKeyValid = validateApiKey(initialState.currentApiKey);

var apiKeyReducer = function (state, action) {
    var nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionTypes.UPDATE_API_KEY:
            nextState.currentApiKey = action.value;
            nextState.isApiKeySaved = false;
            nextState.isApiKeyValid = validateApiKey(nextState.currentApiKey);
            break;
        case ActionTypes.SAVE_API_KEY:
            nextState.key = action.value;
            nextState.isApiKeySaved = true;
            break;
        case ActionTypes.MAP_LOADED:
            nextState.isMapsApiLoaded = true;
            break;
        default:
    }
    console.log("api key state:", nextState);
    return nextState;
};

module.exports = apiKeyReducer;
