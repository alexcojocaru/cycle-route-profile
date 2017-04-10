"use strict";

/**
 * @typedef {object} point
 * @property {number} lat - the latitude
 * @property {number} lng - the longitude
 * @property {number} [ele] - the elevation
 */

/**
 * @typedef {object} route
 * @property {point[]} points - array of route points
 * @property {string} hash - the route hash
 * @property {number} distance - the distance
 * @property {point[]} elevations - array of points with elevation coordinates;
 *    these are not necessary the same points as on the 'points' property
 * @property {string} path - the encoded route path;
 *    see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

const _ = require("underscore");

const logger = require("../util/logger").logger("RoutePlannerReducer");
const ActionTypes = require("../action/routePlannerAction").Types;
const TravelMode = require("../constant/routePlannerConstant").TravelMode;
const EndpointType = require("../constant/routePlannerConstant").EndpointType;

const builders = require("../util/routeBuilders");
const modifiers = require("../util/routeModifiers");
const parsers = require("../util/routeParsers");

const initialState = {
    travelMode: TravelMode.ROAD,
    routeExists: false,
    routes: new Array(),
    distance: 0,

    // the following two are just intermediate values, until both are set and the route is valid
    start: null,
    finish: null,

    // the (lat, lng) geo location of the mouse position when the endpoint selection dialog opened;
    // this is an intermediate value, until it's set as start/finish
    endpoint: null,

    // the (x, y) location of the endpoint selection dialog,
    // inferred from the currentEndpointLocation
    endpointSelectionDialogLocation: { x: 0, y: 0 },
    endpointSelectionDialogVisible: false,

    // whether the controls are disabled (eg. while the elevations are being fetched)
    controlsDisabled: false,
    controlsOpened: false,

    // how many routes are being updated with elevation at a given time;
    // used to re-enable the controls after the elevations for all new routes have been fetched
    updatingRouteCount: 0
};

const routePlannerReducer = function (state, action) {
    logger.debug("current planner state:", state, "; action:", action);

    const nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionTypes.UPDATE_ENDPOINT:
            nextState.endpoint = null; // reset the temp variable, it's been fully used

            switch (action.endpointType) {
                case EndpointType.START:
                    nextState.start = state.endpoint;
                    break;
                case EndpointType.FINISH:
                    nextState.finish = state.endpoint;
                    break;
                default:
                    logger.error("Unknown endpoint type to update:", action.endpointType);
            }

            if (nextState.start && nextState.finish) {
                const route = builders.newRoute(nextState.start, nextState.finish);
                nextState.routes = Array.of(route);
                nextState.routeExists = true;

                // reset the temp variables, they have been fully used
                nextState.start = null;
                nextState.finish = null;
            }

            break;
        case ActionTypes.DELETE_WAYPOINT:
            nextState.routes = modifiers.deleteWaypoint(nextState.routes, action.waypoint);
            break;
        case ActionTypes.UPDATE_ROUTE:
            // TODO if the first point on a route gets moved, the routes are not reconnected
            const newRoutes = _.map(nextState.routes, route => {
                return route.hash === action.oldRouteHash ? action.newRoute : route;
            });
            nextState.routes = modifiers.normalizeRoutes(newRoutes, nextState.routes);
            nextState.distance = parsers.totalDistance(nextState.routes);
            break;
        case ActionTypes.DELETE_ROUTES:
            nextState.routes = [];
            nextState.routeExists = false;
            nextState.distance = 0;
            break;
        case ActionTypes.UPDATE_TRAVEL_MODE:
            nextState.travelMode = action.mode;
            break;
        case ActionTypes.OPEN_ENDPOINT_SELECTION_DIALOG:
            nextState.endpoint = action.geoLocation;
            nextState.endpointSelectionDialogLocation = action.screenLocation;
            nextState.endpointSelectionDialogVisible = true;
            break;
        case ActionTypes.CLOSE_ENDPOINT_SELECTION_DIALOG:
            nextState.endpointSelectionDialogVisible = false;
            break;
        case ActionTypes.TOGGLE_CONTROLS:
            nextState.controlsOpened = !nextState.controlsOpened;
            break;
        case ActionTypes.DISABLE_CONTROLS:
            nextState.controlsDisabled = action.controlsDisabled;
            break;
        case ActionTypes.UPDATING_ELEVATIONS:
            nextState.updatingRouteCount = nextState.updatingRouteCount + 1;
            nextState.controlsDisabled = true;
            break;
        case ActionTypes.UPDATE_ELEVATIONS:
            nextState.routes = _.map(nextState.routes, route => {
                const newRoute = builders.cloneRoute(route);
                if (route.hash === action.routeHash) {
                    newRoute.elevations = action.elevations;
                }
                return newRoute;
            });
            nextState.updatingRouteCount = nextState.updatingRouteCount - 1;
            nextState.controlsDisabled = nextState.updatingRouteCount > 0;
            break;
        default:
    }
    logger.debug("new planner state:", nextState);
    return nextState;
};

module.exports = routePlannerReducer;
