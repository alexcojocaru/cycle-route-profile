"use strict";

var NotificationLevel = require("../constant/notificationConstant").Level;

/**
 * @callback onNotification
 * @param {string} level - notification level
 * @param {string} title - notification title
 * @param {string} message - notification message
 */

/**
 * @descr trigger any notifications on route update
 * @param {onNotification} onNotification - the onNotification callback
 * @param {array} waypoints - the list of simple waypoints (as {lat, lng}) on the current route
 * @param {array} nextWaypoints - the list of simple waypoints (as {lat, lng}) on the next route
 */
var routeUpdated = function(onNotification, waypoints, nextWaypoints) {
    // show the warning only if we don't have 8 points already
    if (waypoints.length !== 23 && nextWaypoints.length === 23) {
        onNotification(
            NotificationLevel.WARNING,
            "Route",
            "The maximum allowed waypoints has been reached; remove one to add one."
        );
    }
    else if (waypoints.length === 0 && nextWaypoints.length === 1) {
        onNotification(
            NotificationLevel.INFO,
            "Route",
            "To delete a marker, click on it."
        );
    }
}
module.exports.routeUpdated = routeUpdated;
