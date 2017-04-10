"use strict";

const _ = require("underscore");

/**
 * @desc Perform a deep comparison between the two given points
 *    to determine if they are equal; only the lat and lng attributes are compared.
 * @param {point} point - a point
 * @param {other} other - the other point
 * @return {boolean} - true if the two points are equal, false otherwise
 */
const isPointEqual = function (point, other) {
    return point.lat === other.lat && point.lng === other.lng;
};
module.exports.isPointEqual = isPointEqual;

/**
 * @desc Find and return the index of the given point in the given point list.
 * @param {point[]} points - the point list to search through
 * @param {point} point - the point to find
 * @param {number[]} avoidIndexes - the indexes in the points list to avoid
 * @return {number} - the point index in the list, or -1 if it is not in the list
 */
const findPointIndex = function (points, point, avoidIndexes = []) {
    return _.findIndex(points, function (p, index) {
        return _.contains(avoidIndexes, index) === false && isPointEqual(p, point);
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
module.exports.findWaypoint = findWaypoint;

/**
 * @desc Return the next route or null if there's none.
 * @param {route[]} routes - the route list
 * @param {number} index - the index of the current route
 * @return {route} - the next route or null
 */
const getNextRoute = function (routes, index) {
    return index < routes.length - 1 ? routes[index + 1] : null;
};
module.exports.getNextRoute = getNextRoute;

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
module.exports.totalDistance = totalDistance;

/**
 * @desc Find if the given route exists in the specified route list.
 *    The match is done by the route hash.
 * @param {route} route - the route to find
 * @param {route[]} routes - the list to find in
 * @return {boolean} - true if the route exists, false otherwise
 */
const routeExists = function (route, routes) {
    return _.find(routes, r => {
        return r.hash === route.hash;
    }) !== undefined;
};
module.exports.routeExists = routeExists;
