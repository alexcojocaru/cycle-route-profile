"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const FileSaver = require("file-saver");
const uuidV4 = require("uuid/v4");

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
 * @desc Update the elevations coordinates across all routes.
 * @param {string} token - the token which was passed to the elevations request
 * @param {pathPoint[]} elevations - the elevations corresponding to the given points
 * @return {object} - the action
 */
const updateElevations = function (token, elevations) {
    return {
        type: Types.UPDATE_ELEVATIONS,
        token: token,
        elevations: elevations
    };
};
module.exports.updateElevations = updateElevations;

/**
 * @desc Fetch the elevation coordinates for the given points.
 * @param {point[]} points - the points
 * @return {object} - the action
 */
module.exports.fetchElevations = function (points) {
    // a unique token representing the current request
    const token = uuidV4();

    return function (dispatch) {
        dispatch({
            type: Types.UPDATING_ELEVATIONS,
            token: token
        });

        dispatch(elevationAction.fetchAlongPath(points, token, updateElevations));
    };
};

const saveGpx = function (token, points) {
    return function (dispatch) {
        dispatch(disableControls(false));

        if (points) {
            const content = formatters.pointListToGpx(points);
            FileSaver.saveAs(content, "route.gpx");
        }
    };
};
module.exports.exportGpx = function (points) {
    return function (dispatch) {
        dispatch(disableControls(true));
        // the token is set to "", for it's not used for matching
        // the elevations against the rendered route
        dispatch(elevationAction.fetchForLocations(points, "", saveGpx));
    };
};

module.exports.exportRouteSheet = function (directions) {
    return function () {
        const content = formatters.routeInstructionsToRouteSheeet(directions);
        FileSaver.saveAs(content, "routeSheet.txt");
    };
};

module.exports.plotAccurateElevationChart = function (points) {
    // a unique token representing the current request
    const token = uuidV4();

    return function (dispatch) {
        dispatch({
            type: Types.UPDATING_ELEVATIONS,
            token: token
        });

        // getElevationsAlongPath - correct elevation aberations in the result set
        // TODO allow non matching points in the results
        // TODO do not redraw the elevation chart if the results are null
        // TODO simplify the point list before calling the callback (ie. remove points
        // with same elevation if distance between then < 1/1000 of total dist)
        dispatch(elevationAction.fetchForLocations(points, token, updateElevations));
    };
};

