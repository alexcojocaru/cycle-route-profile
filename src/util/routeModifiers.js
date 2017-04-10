"use strict";

const _ = require("underscore");
const logger = require("../util/log").routeModifiers;
const hashFunction = require("../util/hash").hashPoints;
const builders = require("./routeBuilders");
const parsers = require("./routeParsers");

// TODO 25
const MAX_ROUTE_POINT_COUNT = 5; // how many point we allow on a route before we split it
// TODO 15
const SPLIT_POINT_COUNT = 4; // how many points to put on the first split segment

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
 * @return {route[]} - a new route list without the given waypoint
 */
const deleteWaypoint = function (routes, waypoint) {
    // find the index of the waypoint to delete
    const { routeIndex, pointIndex } = parsers.findWaypoint(routes, waypoint);
    const newRoutes = builders.cloneRoutes(routes);

    if (routeIndex > -1) {
        const route = newRoutes[routeIndex];
        const nextRoute = parsers.getNextRoute(newRoutes, routeIndex);
        const point = route.points[pointIndex];

        // I need to update the next route
        // if the point to remove is the finish of the current route
        // and the start of the next route
        const updateNextRoute = (route.points.length - 1 === pointIndex) &&
                (nextRoute !== null) &&
                (parsers.isPointEqual(_.first(nextRoute.points), point));
        
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
module.exports.deleteWaypoint = deleteWaypoint;

/**
 * @desc Split the given route into arrays with up to 15 points or,
 *    if it has less than 25 points, clone it and return a one element array.
 * @param {route} route - the route to split
 * @return {route[]} - the array of routes with no more than 25 points
 */
const splitRoute = function (route) {
    const splits = [];
    if (route.points.length < MAX_ROUTE_POINT_COUNT) {
        splits.push(route);
    }
    else {
        // for each sublist of 14 points, add them
        // (plus the next one, for I need the finish/start to overlap) to a new route
        for (let i = 0; i < route.points.length; i += (SPLIT_POINT_COUNT - 1)) {
            const slice = route.points.slice(
                i, Math.min(i + SPLIT_POINT_COUNT, route.points.length));
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
    route.points[0] = builders.clonePoint(point);
    route.hash = hashFunction(route.points);
};

/**
 * @desc Modifies the given route and set the supplied point as finish on the route.
 *    The route hash is updated.
 * @param {route} route - the route to update
 * @param {point} point - the point to set as finish on the route
 */
const resetFinish = function (route, point) {
    route.points[route.points.length - 1] = builders.clonePoint(point);
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

    if (parsers.isPointEqual(_.last(newRoute.points), _.first(newNextRoute.points)) === false) {
        const currentRouteFinishEqual = parsers.isPointEqual(
            _.last(oldRoute.points),
            _.last(newRoute.points));
        const nextRouteFinishEqual = parsers.isPointEqual(
            _.first(oldNextRoute.points),
            _.first(newNextRoute.points));

        if (currentRouteFinishEqual === false && nextRouteFinishEqual === false) {
            // this should  not happen, I don't know how to fix this
            logger.error(`the finish point on route #${index} has changed: \
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
 * @desc normalize the route list and return a new list.
 * @param {route[]} routes - the route list to normalize
 * @return {route[]} - the new route list
 */
const normalizeRoutes = function (routes) {
    const newRoutes = builders.cloneRoutes(routes);

    const needSplit = _.some(newRoutes, function (r) {
        return r.points.length > (MAX_ROUTE_POINT_COUNT - 1);
    });

    // if a route has 25 points or more, it means a new waypoint was added to it;
    // split it and don't reconnect the endpoints, for the start/finish have not changed;
    // otherwise try to reconnect the start/finish points as needed
    const result = needSplit ? splitRoutes(newRoutes) : reconnectRoutes(newRoutes, routes);

    return result;
};
module.exports.normalizeRoutes = normalizeRoutes;

/**
 * @desc Update the elevation coordinate on the points on the given route
 *    with the elevation coordinate on the supplied points.
 *    A 1-to-1 mapping between the route points and the points with elevations is assumed.
 * @param {route} route - the route to update; the source is not modified
 * @param {point[]} pointsWithElevation - the points list, with the elevation attribute set
 * @return {route} - a new route (based on the given one) with points the elevation updated
 */
// TODO probably remove it altogether
const updateElevations = function (route, pointsWithElevation) {
    const newRoute = builders.cloneRoute(route);
    newRoute.points = _.map(newRoute.points, (point, index) => {
        const newPoint = builders.clonePoint(point);
        newPoint.ele = pointsWithElevation[index].ele;
        return newPoint;
    });

    return newRoute;
};
module.exports.updateElevations = updateElevations;
