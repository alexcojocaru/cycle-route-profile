"use strict";

var keyMirror = require("fbjs/lib/keyMirror");


var Type = keyMirror({
    ADD_NOTIFICATION: null,
    DELETE_NOTIFICATIONS: null,
    DISMISS_NOTIFICATION: null
});
module.exports.Type = Type;

/**
 * @desc Add a notification
 * @param {string} level - the notification level
 * @param {string} title - the notification title
 * @param {string} message - the notification content
 * @param {string} [id] - the notification id
 * @return {object} the add notification action
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

/**
 * @desc Remove the notfications with the given IDs from the store only.
 *    The notification system will will remove them as needed.
 * @param {string[]} ids - the notification IDs
 * @return {object} - the delete notifications action
 */
module.exports.deleteNotifications = function (ids) {
    return {
        type: Type.DELETE_NOTIFICATIONS,
        ids: ids
    };
};

/**
 * @desc Dismiss the notification with the given ID from the notification system.
 * @param {string} id - the notification ID
 * @return {object} - the dismiss notifications action
 */
module.exports.dismissNotification = function (id) {
    return {
        type: Type.DISMISS_NOTIFICATION,
        id: id
    };
};
