"use strict";

const NotificationLevel = require("../constant/notificationConstant").Level;
const conversions = require("./mapsApiConversions");

/**
 * @callback notificationCallback
 * @param {string} level - notification level
 * @param {string} title - notification title
 * @param {string} message - notification message
 */

/**
 * @desc Display an INFO message describing how to remove a waypoint.
 * @param {notificationCallback} notificationCallback - the onNotification callback
 */
const firstWaypoint = function (notificationCallback) {
    notificationCallback(
        NotificationLevel.INFO,
        "Route",
        "To delete a waypoint, click on it."
    );
};
module.exports.firstWaypoint = firstWaypoint;

/**
 * @desc Display an INFO message describing how to create a route.
 * @param {notificationCallback} notificationCallback - the onNotification callback
 */
const mapReady = function (notificationCallback) {
    notificationCallback(
        NotificationLevel.INFO,
        "Route",
        "To build a new route, click on the map to select the start and the finish points."
    );
};
module.exports.mapReady = mapReady;

/**
 * @desc trigger a notification on route render error
 * @param {notificationCallback} notificationCallback - the onNotification callback
 * @param {string} status - the status of the route request send to the directions service
 */
const routeError = function (notificationCallback, status) {
    notificationCallback(
        NotificationLevel.ERROR,
        "Route",
        conversions.convertGoogleDirectionsStatus(status)
    );
};
module.exports.routeError = routeError;
