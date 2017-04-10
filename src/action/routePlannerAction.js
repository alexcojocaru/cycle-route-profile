"use strict";

var keyMirror = require("fbjs/lib/keyMirror");


var Types = keyMirror({
    UPDATE_ENDPOINT: null,
    DELETE_WAYPOINT: null,
    UPDATE_ROUTE: null,
    DELETE_ROUTES: null,
    EXPORT_GPX: null,
    UPDATE_TRAVEL_MODE: null,
    OPEN_ENDPOINT_SELECTION_DIALOG: null,
    CLOSE_ENDPOINT_SELECTION_DIALOG: null
});
module.exports.Types = Types;

/**
 * @param {string} endpointType - the type of endpoint to update;
 *    the endpoint location should have been cached already
 * @return {object} - the update endpoint action
 */
module.exports.updateEndpoint = function (endpointType) {
    return {
        type: Types.UPDATE_ENDPOINT,
        endpointType: endpointType
    };
};

/**
 * @param {waypoint} waypoint - the waypoint to delete
 * @return {object} - the delete waypoint action
 */
module.exports.deleteWaypoint = function (waypoint) {
    return {
        type: Types.DELETE_WAYPOINT,
        waypoint: waypoint
    };
};

/**
 * @param {string} [oldRouteHash] - the old hash of the updated route
 * @param {object} [route] - the updated route
 * @return {object} - the update route action
 */
module.exports.updateRoute = function (oldRouteHash, route) {
    return {
        type: Types.UPDATE_ROUTE,
        oldRouteHash: oldRouteHash,
        route: route
    };
};

/**
 * @return {object} - the delete routes action
 */
module.exports.deleteRoutes = function () {
    return {
        type: Types.DELETE_ROUTES
    };
};

module.exports.updateTravelMode = function (mode) {
    return {
        type: Types.UPDATE_TRAVEL_MODE,
        mode: mode
    };
};

module.exports.openEndpointSelectionDialog = function (geoLocation, screenLocation) {
    return {
        type: Types.OPEN_ENDPOINT_SELECTION_DIALOG,
        geoLocation: geoLocation,
        screenLocation: screenLocation
    };
};

module.exports.closeEndpointSelectionDialog = function () {
    return {
        type: Types.CLOSE_ENDPOINT_SELECTION_DIALOG
    };
};
