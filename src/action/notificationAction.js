"use strict";

var keyMirror = require("fbjs/lib/keyMirror");


var Type = keyMirror({
    ADD_NOTIFICATION: null,
    DELETE_NOTIFICATION: null
});
module.exports.Type = Type;

var addNotification = function (level, title, message) {
    return {
        type: Type.ADD_NOTIFICATION,
        level: level,
        title: title,
        message: message
    };
};
module.exports.addNotification = addNotification;

module.exports.deleteNotification = function (id) {
    return {
        type: Type.DELETE_NOTIFICATION,
        id: id
    };
};
