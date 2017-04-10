"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const FileSaver = require("file-saver");
const _ = require("underscore");

const elevationAction = require("./elevationAction");
const notificationAction = require("./notificationAction");
const NotificationLevel = require("../constant/notificationConstant").Level;

const builders = require("../util/routeBuilders");
const formatters = require("../util/routeFormatters");
const modifiers = require("../util/routeModifiers");
const parsers = require("../util/routeParsers");


const Types = keyMirror({
    UPDATE_ENDPOINT: null,
    DELETE_WAYPOINT: null,
    UPDATE_ROUTE: null,
    DELETE_ROUTES: null,
    EXPORT_GPX: null,
    UPDATE_TRAVEL_MODE: null,
    OPEN_ENDPOINT_SELECTION_DIALOG: null,
    CLOSE_ENDPOINT_SELECTION_DIALOG: null,
    TOGGLE_CONTROLS: null,
    DISABLE_CONTROLS: null,
    UPDATING_ELEVATIONS: null,
    UPDATE_ELEVATIONS: null,
    FETCH_ELEVATIONS: null
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
 * @return {object} - an update route action
 */
module.exports.deleteWaypoint = function (waypoint) {
    return {
        type: Types.DELETE_WAYPOINT,
        waypoint: waypoint
    };
};

/**
 * @param {string} oldRouteHash - the old hash of the new route
 * @param {route} newRoute - the new route
 * @return {object} - an update route action
 */
module.exports.updateRoute = function (oldRouteHash, newRoute) {
    return {
        type: Types.UPDATE_ROUTE,
        oldRouteHash: oldRouteHash,
        newRoute: newRoute
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

module.exports.toggleControls = function () {
    return {
        type: Types.TOGGLE_CONTROLS
    };
};

/**
 * @desc Fetch the elevation coordinates for the given points.
 * @param {string} routeHash - the hash code of the route containing the given points
 * @param {point[]} points - the points to fetch elevations for
 * @return {object} - the action
 */
module.exports.fetchElevations = function (routeHash, points) {
    return function (dispatch) {
        dispatch({
            type: Types.UPDATING_ELEVATIONS,
            routeHash: routeHash
        });

        dispatch(elevationAction.fetch(routeHash, points));
    };
};

/**
 * @desc Update the elevations coordinates on the given route.
 * @param {string} routeHash - the hash code of the route to update
 * @param {point[]} elevations - the list of points with elevation coordinates
 * @return {object} - the action
 */
module.exports.updateElevations = function (routeHash, elevations) {
    return {
        type: Types.UPDATE_ELEVATIONS,
        routeHash: routeHash,
        elevations: elevations
    };
};

module.exports.exportGpx = function (routes) {
    const content = formatters.routesToGpx(routes);
    FileSaver.saveAs(content, "route.gpx");
};
