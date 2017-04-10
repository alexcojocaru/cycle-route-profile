"use strict";

var _ = require("underscore");

const logger = require("../util/log").containerReducer;
var ActionTypes = require("../action/containerAction").Types;
var ViewType = require("../constant/containerConstant").ViewType;

var initialState = {
    view: ViewType.ROUTE_PLANNER
};

var containerReducer = function (state, action) {
    var nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionTypes.UPDATE_VIEW:
            nextState.view = action.value;
            break;
        default:
    }
    logger.debug("container state:", nextState);
    return nextState;
};

module.exports = containerReducer;
