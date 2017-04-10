"use strict";

var ActionTypes = require("../action/containerAction").Types;
var ViewType = require("../constant/containerConstant").ViewType;
var _ = require("underscore");

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
    console.log("container state:", nextState);
    return nextState;
};

module.exports = containerReducer;
