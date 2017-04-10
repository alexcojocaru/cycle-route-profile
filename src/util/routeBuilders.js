"use strict";

var _ = require("underscore");
var hashFunction = require("object-hash");

/**
 * @desc Clone the given route and return the clone.
 *    The points array is clones, the hash is recalculated,
 *    but the points themselves are not cloned.
 * @param {route} route - the route to clone
 * @return {route} - the clone
 */
const cloneRoute = function (route) {
    const points = _.clone(route.points);
    return {
        points: points,
        hash: hashFunction(points),
        distance: route.distance,
        path: route.path
    };
};
module.exports.cloneRoute = cloneRoute;
