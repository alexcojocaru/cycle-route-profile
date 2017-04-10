"use strict";

var keyMirror = require("fbjs/lib/keyMirror");


var Types = keyMirror({
    UPDATE_ENDPOINT: null,
    UPDATE_WAYPOINTS: null,
    UPDATE_ROUTE: null,
    UPDATE_TRAVEL_MODE: null,
    OPEN_ENDPOINT_SELECTION_DIALOG: null,
    CLOSE_ENDPOINT_SELECTION_DIALOG: null
});
module.exports.Types = Types;

/**
 * @param {string} endpointType - the type of endpoint to update
 * @param {object} [point] - the point to update
 * @return {object} - the update endpoint action
 */
module.exports.updateEndpoint = function (endpointType, point) {
    return {
        type: Types.UPDATE_ENDPOINT,
        endpointType: endpointType,
        point: point
    };
};

/**
 * @param {array} waypoints - an array of waypoints, in {lat, lng} format
 * @return {object} - the update waypoints action
 */
module.exports.updateWaypoints = function (waypoints) {
    return {
        type: Types.UPDATE_WAYPOINTS,
        waypoints: waypoints
    };
};

module.exports.updateRoute = function (start, finish, waypoints, distance) {
    return {
        type: Types.UPDATE_ROUTE,
        start: start,
        finish: finish,
        waypoints: waypoints,
        distance: distance
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
