"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const FileSaver = require("file-saver");
const _ = require("underscore");

const elevationAction = require("./elevationAction");

const formatters = require("../util/routeFormatters");
const modifiers = require("../util/routeModifiers");
const parsers = require("../util/routeParsers");


const Types = keyMirror({
    UPDATE_ENDPOINT: null,
    // for route updates triggered by the app
    UPDATE_ROUTE_INTERNAL: null,
    // for route updates triggered by the Google APIs as result to user requests
    UPDATE_ROUTE_EXTERNAL: null,
    DELETE_ROUTES: null,
    EXPORT_GPX: null,
    UPDATE_TRAVEL_MODE: null,
    OPEN_ENDPOINT_SELECTION_DIALOG: null,
    CLOSE_ENDPOINT_SELECTION_DIALOG: null,
    TOGGLE_CONTROLS: null,
    DISABLE_CONTROLS: null,
    UPDATING_ELEVATIONS: null,
    UPDATE_ELEVATIONS: null
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
 * @param {route[]} routes - the route list to update
 * @param {waypoint} waypoint - the waypoint to delete
 * @return {object} - the update route internal action
 */
module.exports.deleteWaypoint = function (routes, waypoint) {
    const newRoutes = modifiers.deleteWaypoint(routes, waypoint);
    return {
        type: Types.UPDATE_ROUTE_INTERNAL,
        routes: newRoutes
    };
};

/**
 * @param {string} [oldRouteHash] - the old hash of the updated route
 * @param {object} [route] - the updated route
 * @param {route[]} routes - the route list to update
 * @return {object} - the update route external action
 */
module.exports.updateRoute = function (oldRouteHash, route, routes) {
    return function (dispatch) {
        const newRoutes = modifiers.updateRoutes(
                oldRouteHash,
                route,
                routes);
        dispatch({
            type: Types.UPDATE_ROUTE_EXTERNAL,
            routes: newRoutes
        });

        // just the routes which are new compared to the original route list
        const netNewRoutes = _.filter(newRoutes, r => {
            return parsers.routeExists(r, routes) === false;
        });

        // tell the app that we have that many routes being updated with elevations
        dispatch({
            type: Types.UPDATING_ELEVATIONS,
            routeCount: netNewRoutes.length
        });

        // for each route which has changed, fetch the elevations
        _.each(netNewRoutes, r => dispatch(elevationAction.fetch(r)));
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
 * @desc Update the points on the given route with elevation coordinates.
 * @param {string} routeHash - the hash code of the route to update
 * @param {point[]} points - the list of points with elevation coordinates
 * @return {object} - the action
 */
module.exports.updateElevations = function (routeHash, points) {
    return {
        type: Types.UPDATE_ELEVATIONS,
        hash: routeHash,
        points: points
    };
};

module.exports.exportGpx = function (routes) {
    const content = formatters.routesToGpx(routes);
    FileSaver.saveAs(content, "route.gpx");
};
