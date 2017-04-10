"use strict";

const _ = require("underscore");
const uuidV4 = require("uuid/v4");

const ActionType = require("../action/notificationAction").Type;


const initialState = {
    notifications: []
};

const notificationReducer = function (state, action) {
    const nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionType.ADD_NOTIFICATION:
            nextState.notifications = [
                {
                    // use the provided id or generate a unique one
                    id: action.id || uuidV4(),
                    level: action.level,
                    title: action.title,
                    message: action.message,
                    // if the id is provided, the app will dismiss the action
                    persistent: Boolean(action.id)
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
