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
    return _.reduce(routes, (distance, route) => (route.distance || 0) + distance, 0);
};
module.exports.totalDistance = totalDistance;

/**
 * @desc Find if the route with the given hash exists in the specified route list.
 * @param {route[]} routes - the list to find in
 * @param {string} routeHash - the hash of the route to find
 * @return {route} - the target route, or undefined if it cannot be found
 */
const findRoute = function (routes, routeHash) {
    return _.find(routes, r => r.hash === routeHash);
};
module.exports.findRoute = findRoute;

/**
 * @desc Check if all routes in the routes list are the same as the routes in the others list.
 *    The verification does not take the point elevations into account; it is only done
 *    by comparing the route hashes.
 * @param {route[]} routes - a route list
 * @param {route[]} others - another route list
 * @return {boolean} - true if the routes are the same between the two lists, false otherwise
 */
const areRoutesSame = function (routes, others) {
    // the length comparison avoids the negative result for empty "others" list
    return others.length === routes.length &&
            _.every(others, other => findRoute(routes, other.hash) !== undefined);
};
module.exports.areRoutesSame = areRoutesSame;

/**
 * @desc Flatten the given points lists. The resulting array will not
 *    contain the first point on each subsequent list (for it is considered to be
 *    a duplicate of the last point on the previous list).
 * @param {point[]} pointLists - the list of points lists
 *     (each entry in the pointLists is an array of points) to flatten
 * @return {point[]} - a flat array of points
 */
module.exports.concatenatePointsLists = function (pointLists) {
    return _.flatten(
        _.map(pointLists, (pointList, index) => {
            // the first point on each subsequent list is a duplicate
            // of the last point on the previous list
            return _.rest(pointList, index > 0 ? 1 : 0);
        })
     );
};

/**
 * @desc Flatten the given instructions lists.
 * @param {routeInstruction[]} instructionsLists - the list of instructions lists
 *     (each entry in the instructionsLists is an array of routeInstructions) to flatten
 * @return {routeInstruction[]} - a flat array of route instructions
 */
module.exports.concatenateRouteInstructionsLists = function (instructionsLists) {
    return _.flatten(instructionsLists);
};

/**
 * @desc Calculate the 2D distance between the two given points,
 *    given their lat and lng coordinates.
 *    Both points are considered to be at sea level.
 * @param {point} point1 - a point
 * @param {point} point2 - another point
 * @return {number} - the distance in meters
 */
module.exports.calculate2dDistance = function (point1, point2) {
    const seaLevel = 6371000;

    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;

    const lng1 = point1.lng * Math.PI / 180;
    const lng2 = point2.lng * Math.PI / 180;

    // formulas taken from http://answers.google.com/answers/threadview?id=326655
    const x1 = seaLevel * Math.cos(lat1) * Math.sin(lng1);
    const y1 = seaLevel * Math.sin(lat1);
    const z1 = seaLevel * Math.cos(lat1) * Math.cos(lng1);

    const x2 = seaLevel * Math.cos(lat2) * Math.sin(lng2);
    const y2 = seaLevel * Math.sin(lat2);
    const z2 = seaLevel * Math.cos(lat2) * Math.cos(lng2);

    return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2) + Math.pow((z2 - z1), 2));
};

/**
 * @desc Calculate the distance between the two given points,
 *    given their lat, lng and ele coordinates.
 *    If the elevation is not set on any of the points, it's considered to be 0.
 *    If the elevation is not set on only one point, it's considered to be equal
 *    to the elevation on the other point.
 * @param {point} point1 - a point
 * @param {point} point2 - another point
 * @return {number} - the distance in meters
 */
module.exports.calculate3dDistance = function (point1, point2) {
    const eleSafe1 = typeof point1.ele !== "undefined" && point1.ele !== null
            ? point1.ele
            : (point2.ele || 0);
    const eleSafe2 = typeof point2.ele !== "undefined" && point2.ele !== null
            ? point2.ele
            : (point1.ele || 0);

    // correct the elevations by adding the Earth radius
    const ele1 = 6371000 + parseFloat(eleSafe1);
    const ele2 = 6371000 + parseFloat(eleSafe2);

    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;

    const lng1 = point1.lng * Math.PI / 180;
    const lng2 = point2.lng * Math.PI / 180;

    // formulas taken from http://answers.google.com/answers/threadview?id=326655
    const x1 = ele1 * Math.cos(lat1) * Math.sin(lng1);
    const y1 = ele1 * Math.sin(lat1);
    const z1 = ele1 * Math.cos(lat1) * Math.cos(lng1);

    const x2 = ele2 * Math.cos(lat2) * Math.sin(lng2);
    const y2 = ele2 * Math.sin(lat2);
    const z2 = ele2 * Math.cos(lat2) * Math.cos(lng2);

    return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2) + Math.pow((z2 - z1), 2));
};
