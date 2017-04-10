"use strict";

const hashFunction = require("object-hash");
const _ = require("underscore");

/**
 * @desc Hash the lng and lat attributes of the array of points.
 * @param {point[]} points - array of points to hash
 * @return {string} - the hash
 */
module.exports.hashPoints = function (points) {
    return hashFunction(_.map(points, function (point) {
        return {
            lat: point.lat,
            lng: point.lng
        };
    }));
};

/**
 * @desc Hash the lng, lat and ele attributes of the array of points.
 * @param {point[]} points - array of points to hash
 * @return {string} - the hash
 */
module.exports.hashFullPoints = function (points) {
    if (typeof points === "undefined") {
        return "";
    }

    return hashFunction(_.map(points, function (point) {
        return {
            lat: point.lat,
            lng: point.lng,
            ele: point.ele
        };
    }));
};
