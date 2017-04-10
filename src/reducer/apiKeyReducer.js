"use strict";

const _ = require("underscore");
const logger = require("../util/logger").logger("ApiKeyReducer");
const ActionTypes = require("../action/apiKeyAction.js").Types;

const validateApiKey = function (key) {
    return typeof key === "string" && key.length > 0;
};

const initialState = {
    key: "",  // the API key
    currentApiKey: "",
    isApiKeySaved: false,
    isApiKeyValid: false,
    isMapsApiLoaded: false
};
initialState.isApiKeyValid = validateApiKey(initialState.currentApiKey);

const apiKeyReducer = function (state, action) {
    logger.debug("current api key state:", state, "; action:", action);

    const nextState = _.clone(state || initialState);

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
    logger.debug("new api key state:", nextState);
    return nextState;
};

module.exports = apiKeyReducer;
