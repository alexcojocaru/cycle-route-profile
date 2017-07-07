"use strict";

var _ = require("underscore");
var hashFunction = require("../util/hash").hashPoints;

const clonePoint = function (point) {
    return {
        lat: point.lat,
        lng: point.lng,
        ele: point.ele
    };
};
module.exports.clonePoint = clonePoint;

const newRoute = function (start, finish) {
    const points = Array.of(start, finish);
    return {
        points: points,
        hash: hashFunction(points)
    };
};
module.exports.newRoute = newRoute;

/**
 * @desc Clone the given route and return the clone.
 *    The points array is cloned, the hash is recalculated,
 *    but the points themselves are not cloned.
 *    Same for the elevations array.
 * @param {route} route - the route to clone
 * @return {route} - the clone
 */
const cloneRoute = function (route) {
    const points = _.clone(route.points);
    return {
        points: points,
        hash: hashFunction(points),
        distance: route.distance,
        path: route.path,
        elevations: route.elevations
    };
};
module.exports.cloneRoute = cloneRoute;

/**
 * @desc Clone the given route array and return the clone.
 *    The points array is cloned, the hash is recalculated,
 *    but the points themselves are not cloned.
 * @param {array} routes - the routes array to clone
 * @return {array} - the clone
 */
const cloneRoutes = function (routes) {
    return _.map(routes, route => cloneRoute(route));
};
module.exports.cloneRoutes = cloneRoutes;
