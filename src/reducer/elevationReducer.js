"use strict";

var _ = require("underscore");

const logger = require("../util/logger").logger("ElevationReducer");
var ActionTypes = require("../action/elevationAction").Types;
var FetchStatus = require("../constant/elevationConstant").FetchStatus;

var initialState = {
    fetchStatus: FetchStatus.SUCCESS,
    fetchMessage: ""
};

var elevationReducer = function (state, action) {
    logger.debug("current elevation state:", state, "; action:", action);

    var nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionTypes.UPDATE_STATUS:
            nextState.fetchStatus = action.value;
            nextState.fetchMessage = action.message;
            break;
        default:
    }
    logger.debug("new elevation state:", nextState);
    return nextState;
};

module.exports = elevationReducer;
