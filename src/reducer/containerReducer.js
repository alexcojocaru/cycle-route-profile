"use strict";

var _ = require("underscore");

const logger = require("../util/logger").logger("ContainerReducer");
var ActionTypes = require("../action/containerAction").Types;
var ViewType = require("../constant/containerConstant").ViewType;

var initialState = {
    view: ViewType.ROUTE_PLANNER
};

var containerReducer = function (state, action) {
    logger.debug("current container state:", state, "; action:", action);

    var nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionTypes.UPDATE_VIEW:
            nextState.view = action.value;
            break;
        default:
    }
    logger.debug("new container state:", nextState);
    return nextState;
};

module.exports = containerReducer;
