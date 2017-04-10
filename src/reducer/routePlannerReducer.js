"use strict";

/**
 * @typedef {object} point
 * @property {number} lat - the latitude
 * @property {number} lng - the longitude
 */

/**
 * @typedef {object} route
 * @property {point[]} points - array of route points
 * @property {string} hash - the route hash
 * @property {number} distance - the distance
 * @property {string} path - the encoded route path;
 *    see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

var _ = require("underscore");
var hashFunction = require("object-hash");

var ActionTypes = require("../action/routePlannerAction").Types;
var TravelMode = require("../constant/routePlannerConstant").TravelMode;
var EndpointType = require("../constant/routePlannerConstant").EndpointType;

var builders = require("../util/routeBuilders");

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

    // the (x, y) location of the endpoint selection dialog, inferred from the currentEndpointLocation
    endpointSelectionDialogLocation: { x: 0, y: 0 },
    endpointSelectionDialogVisible: false,

    // whether the controls are disabled (eg. while the elevations are being fetched)
    controlsDisabled: false,
    controlsOpened: false
};

/**
 * @desc Find and return the index of the given point in the given point list.
 * @param {point[]} points - the point list to search through
 * @param {point} point - the point to find
 * @param {number[]} avoidIndexes - the indexes in the points list to avoid
 * @return {number} - the point index in the list, or -1 if it is not in the list
 */
const findPointIndex = function (points, point, avoidIndexes = []) {
    return _.findIndex(points, function (p, index) {
        return _.contains(avoidIndexes, index) === false && _.isEqual(p, point);
    });
};

/**
 * @desc Find the given waypoint in the supplied route list.
 *    The global start point (ie. the start of the first route)
 *    and the global finish point (ie. the finish of the last route)
 *    are excluded from searching.
 * @param {route[]} routes - the route list to search through
 * @param {point} waypoint - the waypoint to look for in the route list
 * @return {object} - an object with routeIndex and pointIndex as properties
 */
const findWaypoint = function (routes, waypoint) {
    // I don't want to find it again when returning the result
    let pointIndex;

    const routeIndex = _.findIndex(routes, function (route, index) {
        // ignore the first start or the last finish point;
        // they can be on the same route, if there's a single route in the list
        const avoidIndexes = [];
        if (index === 0) {
            avoidIndexes.push(0);
        }
        if (index === routes.length - 1) {
            avoidIndexes.push(route.points.length - 1);
        }

        pointIndex = findPointIndex(route.points, waypoint, avoidIndexes);
        return pointIndex > -1;
    });

    return {
        routeIndex: routeIndex,
        pointIndex: pointIndex
    };
};

/**
 * @desc Return the next route or null if there's none.
 * @param {route[]} routes - the route list
 * @param {number} index - the index of the current route
 * @return {route} - the next route or null
 */
const getNextRoute = function (routes, index) {
    return index < routes.length - 1 ? routes[index + 1] : null;
};

/**
 * @desc Given a route, move its start point to the next route and remove it from the list.
 * @param {route[]} routes - the list of routes
 * @param {number} index - the index of the route to collapse
 */
const collapseCurrentRouteToNext = function (routes, index) {
    const route = routes[index];
    const nextRoute = routes[index + 1];

    // remove the current route
    routes.splice(index, 1);
    // insert the start point of the current route as start point on the next
    nextRoute.points.splice(0, 0, _.first(route.points));

    nextRoute.hash = hashFunction(nextRoute.points);
};

/**
 * @desc Given a route, move the finish point on the next route to the current route
 *    and remove the next route from the list.
 * @param {route[]} routes - the list of routes
 * @param {number} index - the index of the route to collapse the next one to
 */
const collapseNextRouteToCurrent = function (routes, index) {
    const route = routes[index];
    const nextRoute = routes[index + 1];

    // remove the next route
    routes.splice(index + 1, 1);
    // add the finish point of the next route to the current route
    route.points.splice(route.points.length, 0, _.last(nextRoute.points));

    route.hash = hashFunction(route.points);
};

/**
 * @desc Delete the waypoint from the first route which contains it.
 *    If the waypoint is the global start or the global finish, nothing is done.
 *    If the route containing the waypoint is left with a single point after waypoint deletion,
 *    it will be merged into the adjacent route.
 * @param {route[]} routes - the route list
 * @param {point} waypoint - the waypoint to delete; it cannot be the global start or finish
 * @return {route[]} - the new route list without the given waypoint
 */
const deleteWaypoint = function (routes, waypoint) {
    // find the index of the waypoint to delete
    const { routeIndex, pointIndex } = findWaypoint(routes, waypoint);

    const newRoutes = _.map(routes, function (route) {
        return builders.cloneRoute(route);
    });

    if (routeIndex > -1) {
        const route = newRoutes[routeIndex];
        const nextRoute = getNextRoute(newRoutes, routeIndex);
        const point = route.points[pointIndex];

        // I need to update the next route
        // if the point to remove is the finish of the current route
        // and the start of the next route
        const updateNextRoute = (route.points.length - 1 === pointIndex) &&
                (nextRoute !== null) &&
                (_.isEqual(_.first(nextRoute.points), point));
        
        // remove the given waypoint from the route which contains it
        route.points = _.reject(route.points, function (p, index) {
            return index === pointIndex;
        });

        // remove the first point on the next route, if needed
        if (updateNextRoute) {
            nextRoute.points = _.rest(nextRoute.points);
            // update the hash later, in the following else
        }

        if (route.points.length === 1 && nextRoute.points.length === 1) {
            // we have two incomplete routes; delete the first
            // and move the start point on it to the next route as start point
            collapseCurrentRouteToNext(newRoutes, routeIndex);
        }
        else if (route.points.length === 1) {
            // just the current route is incomplete;
            // since I already deleted the start of the next route,
            // move the start of the current route as start on the next one
            collapseCurrentRouteToNext(newRoutes, routeIndex);
        }
        else if (nextRoute !== null && nextRoute.points.length === 1) {
            // just the next route is incomplete;
            // since I already deleted the finish of the current route,
            // move the finish of the next route as finish on the current one
            collapseNextRouteToCurrent(newRoutes, routeIndex);
        }
        else {
            // the current and next routes have enough waypoints to be valid;
            // since I already deleted the start of the next route,
            // I have room for adding one more point:
            // duplicate the finish on the current route as start on the next one
            if (updateNextRoute) {
                nextRoute.points.splice(0, 0, _.last(route.points));
                nextRoute.hash = hashFunction(nextRoute.points);
            }
            route.hash = hashFunction(route.points);
        }
    }

    return newRoutes;
};

/**
 * @desc Split the given route into arrays with up to 15 points or,
 *    if it has less than 25 points, clone it and return a one element array.
 * @param {route} route - the route to split
 * @return {route[]} - the array of routes with no more than 25 points
 */
const splitRoute = function (route) {
    const splits = [];
    if (route.points.length < 5) { // TODO 25
        splits.push(route);
    }
    else {
        // for each sublist of 14 points, add them
        // (plus the next one, for I need the finish/start to overlap) to a new route
        for (let i = 0; i < route.points.length; i += 3) { // TODO 14
            const slice = route.points.slice(i, Math.min(i + 4, route.points.length)); // TODO 15
            splits.push({
                points: slice,
                hash: hashFunction(slice)
            });
        }
    }
    return splits;
};

/**
 * @desc Each route in the list with 25 points or more is split into two routes.
 * @param {route[]} routes - the list of routes to split as needed
 * @return {route[]} - a new list of routes with no more than 24 points each
 */
const splitRoutes = function (routes) {
    const newRoutes = new Array();
    _.each(routes, function (r) {
        const splits = splitRoute(r);
        newRoutes.push(...splits);
    });
    return newRoutes;
};

/**
 * @desc Modifies the given route and set the supplied point as start on the route.
 *    The route hash is updated.
 * @param {route} route - the route to update
 * @param {point} point - the point to set as start on the route
 */
const resetStart = function (route, point) {
    route.points[0] = point;
    route.hash = hashFunction(route.points);
};

/**
 * @desc Modifies the given route and set the supplied point as finish on the route.
 *    The route hash is updated.
 * @param {route} route - the route to update
 * @param {point} point - the point to set as finish on the route
 */
const resetFinish = function (route, point) {
    route.points[route.points.length - 1] = point;
    route.hash = hashFunction(route.points);
};

/**
 * @desc Modify the route at the given index in the new routes list or the one after it,
 *    in order to reconnect the finish point on the given route
 *    with the start point on the next route.
 * @param {route[]} newRoutes - the list of new routes
 * @param {route[]} oldRoutes - the list of old routes
 * @param {number} index - the index in the [old] routes list of the current route
 */
const reconnectRoute = function (newRoutes, oldRoutes, index) {
    const newRoute = newRoutes[index];
    const newNextRoute = newRoutes[index + 1];

    const oldRoute = oldRoutes[index];
    const oldNextRoute = oldRoutes[index + 1];

    if (_.isEqual(_.last(newRoute.points), _.first(newNextRoute.points)) === false) {
        const currentRouteFinishEqual = _.isEqual(
            _.last(oldRoute.points),
            _.last(newRoute.points));
        const nextRouteFinishEqual = _.isEqual(
            _.first(oldNextRoute.points),
            _.first(newNextRoute.points));

        if (currentRouteFinishEqual === false && nextRouteFinishEqual === false) {
            // this should  not happen, I don't know how to fix this
            console.log(`ERROR: \
the finish point on route #${index} has changed: \
'${JSON.stringify(_.last(newRoute.points))}'\
, but the start point on the following route has changed too: \
'${JSON.stringify(_.first(newNextRoute.points))}'\
; cannot reconcile these changes, for I don't know which point is the source of truth`);
        }
        else if (currentRouteFinishEqual === true && nextRouteFinishEqual === false) {
            // the start of the next route changed (so this is the source of truth),
            // let's change the finish of the current route to match that
            resetFinish(newRoute, _.first(newNextRoute.points));
        }
        else if (currentRouteFinishEqual === false && nextRouteFinishEqual === true) {
            // the finish of the current route changed (so this is the source of truth),
            // let's change the start of the next route to match that
            resetStart(newNextRoute, _.last(newRoute.points));
        }
    }
};

/**
 * @desc For each route in the list, make sure the finish/start points coincide.
 * @param {route[]} routes - the list of routes to reconnect
 * @param {route[]} oldRoutes - the list of old routes
 * @return {route[]} - the route list which was passed as argument,
 *    but with all endpoints reconnected
 */
const reconnectRoutes = function (routes, oldRoutes) {
    // check whether the finish of a route does not match the start of the next one and fix
    _.each(_.initial(routes), function (route, index) {
        reconnectRoute(routes, oldRoutes, index);
    });

    return routes;
};

/**
 * @desc update the route list with the given route and return a new copy of the list.
 * @param {string} oldRouteHash - the old hash of the route to update
 * @param {route} route - the route to update
 * @param {route[]} routes - the existing route list
 * @return {route[]} - the updated route list
 */
const updateRoutes = function (oldRouteHash, route, routes) {
    // build a new list, with the old route removed and the new route inserted in the same position
    const newRoutes = _.map(routes, function (r) {
        return builders.cloneRoute(r.hash === oldRouteHash ? route : r);
    });

    const needSplit = _.some(newRoutes, function (r) {
        return r.points.length > 4; // TODO 24
    });

    // if a route has 25 points or more, it means a new waypoint was added to it;
    // split it and don't reconnect the endpoints, for the start/finish have not changed;
    // otherwise try to reconnect the start/finish points as needed
    const result = needSplit ? splitRoutes(newRoutes) : reconnectRoutes(newRoutes, routes);

    return result;
};

/**
 * @desc Sum the distance of each of the given routes and return it.
 * @param {route[]} routes - the route list
 * @return {number} - the total distance
 */
const totalDistance = function (routes) {
    return _.reduce(routes, function (distance, route) {
        return (route.distance || 0) + distance;
    }, 0);
};

const routePlannerReducer = function (state, action) {
console.log("current reducer state:", state); // eslint-disable-line indent
console.log("action:", action); // eslint-disable-line indent
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
                    console.log("Unknown endpoint type to update:", action.endpointType);
            }

            if (nextState.start && nextState.finish) {
                const points = Array.of(nextState.start, nextState.finish);
                const hash = hashFunction(points);
                const route = {
                    points: points,
                    hash: hash
                };
                nextState.routes = Array.of(route);
                nextState.routeExists = true;

                // reset the temp variables, they have been fully used
                nextState.start = null;
                nextState.finish = null;
            }

            break;
        case ActionTypes.DELETE_WAYPOINT:
            nextState.routes = deleteWaypoint(state.routes, action.waypoint);
            break;
        case ActionTypes.UPDATE_ROUTE:
            nextState.routes = updateRoutes(action.oldRouteHash, action.route, nextState.routes);
            nextState.distance = totalDistance(nextState.routes);
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
        default:
    }
console.log("next reducer state:", nextState); // eslint-disable-line indent
    return nextState;
};

module.exports = routePlannerReducer;
