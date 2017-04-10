"use strict";

var _ = require("underscore");

var ActionType = require("../action/notificationAction").Type;


var initialState = {
    notifications: []
};

var id = 0;

var notificationReducer = function (state, action) {
    var nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionType.ADD_NOTIFICATION:
            nextState.notifications = [
                {
                    id: id + 1,
                    level: action.level,
                    title: action.title,
                    message: action.message
                }
            ];
            break;
        case ActionType.DELETE_NOTIFICATION:
            nextState.notifications = _.without(
                nextState.notifications,
                _.findWhere(
                    nextState.notifications,
                    { id: action.id }
                )
            );
            break;
        default:
    }
    console.log("notification state:", nextState);
    return nextState;
};

module.exports = notificationReducer;
