"use strict";

var keyMirror = require("fbjs/lib/keyMirror");

var notificationAction = require("./notificationAction");
var NotificationLevel = require("../constant/notificationConstant").Level;


var Types = keyMirror({
    UPDATE_API_KEY: null,
    SAVE_API_KEY: null,
    MAP_LOADED: null
});
module.exports.Types = Types;

module.exports.updateApiKey = function (key) {
    return {
        type: Types.UPDATE_API_KEY,
        value: key
    };
};

module.exports.loadMap = function (key) {
    return function (dispatch) {
        dispatch({
            type: Types.SAVE_API_KEY,
            value: key
        });

        window.initMap = function () {
            dispatch({
                type: Types.MAP_LOADED
            });
            dispatch(notificationAction.addNotification(
                NotificationLevel.INFO,
                "Google Map",
                "To change the API key, you have to reload the page," +
                        " which will discard all your data."
            ));
        };
 
        // I assume the map has never been loaded,
        // for the "load map" button is disabled after the maps loads.
        var apiUrl = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap`;
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = apiUrl;
        document.body.appendChild(script);
    };
};

