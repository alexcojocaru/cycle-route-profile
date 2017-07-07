"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const FileSaver = require("file-saver");

const elevationAction = require("./elevationAction");

const formatters = require("../util/routeFormatters");


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

const disableControls = function (disabled) {
    return {
        type: Types.DISABLE_CONTROLS,
        controlsDisabled: disabled
    };
};
module.exports.disableControls = disableControls;

module.exports.toggleControls = function () {
    return {
        type: Types.TOGGLE_CONTROLS
    };
};

/**
 * @desc Fetch the elevation coordinates for the given points.
 * @param {point[]} points - the points
 * @param {string} pointsHash - the hash of the given points
 * @return {object} - the action
 */
module.exports.fetchElevations = function (points, pointsHash) {
    return function (dispatch) {
        dispatch({
            type: Types.UPDATING_ELEVATIONS,
            pointsHash: pointsHash
        });

        dispatch(elevationAction.fetchAlongPath(points, pointsHash));
    };
};

/**
 * @desc Update the elevations coordinates across all routes.
 * @param {string} pointsHash - the hash of the points list used to fetch the elevations coordinates
 *    (NB: those points are not the same - in terms of lat&lng - as in the elevations array)
 * @param {pathPoint[]} elevations - the elevations corresponding to the given points
 * @return {object} - the action
 */
module.exports.updateElevations = function (pointsHash, elevations) {
    return {
        type: Types.UPDATE_ELEVATIONS,
        pointsHash: pointsHash,
        elevations: elevations
    };
};

module.exports.exportGpx = function (points) {
    return function (dispatch) {
        dispatch(disableControls(true));
        dispatch(elevationAction.fetchForLocations(points));
    };
};

module.exports.fetchForLocationsComplete = function (points) {
    return function (dispatch) {
        dispatch(disableControls(false));

        if (points) {
            const content = formatters.pointListToGpx(points);
            FileSaver.saveAs(content, "route.gpx");
        }
    };
};
