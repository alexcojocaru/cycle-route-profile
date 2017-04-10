"use strict";

var keyMirror = require("fbjs/lib/keyMirror");


var Type = keyMirror({
    ADD_NOTIFICATION: null,
    DELETE_NOTIFICATION: null
});
module.exports.Type = Type;

/**
 * @desc An add-notification action
 * @param {string} level - the notification level
 * @param {string} title - the notification title
 * @param {string} message - the notification content
 * @param {string} [id] - the notification id
 * @return {object} the action object
 */
var addNotification = function (level, title, message, id) {
    return {
        type: Type.ADD_NOTIFICATION,
        level: level,
        title: title,
        message: message,
        id: id
    };
};
module.exports.addNotification = addNotification;

module.exports.deleteNotification = function (id) {
    return {
        type: Type.DELETE_NOTIFICATION,
        id: id
    };
};
