"use strict";

var _ = require("underscore");

var initialState = {};

var routePlannerReducer = function (state, action) {
    var nextState = _.clone(state || initialState);

    switch (action.type) {
        default:
            return nextState;
    }
};

module.exports = routePlannerReducer;
