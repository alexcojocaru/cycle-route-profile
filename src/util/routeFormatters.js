"use strict";

/**
 * @descr Format the given distance to a human readable value
 * @param {number} distance - the distance in meters
 * @return {string} - the distance in meters or kilometers, including the unit
 */
var formatDistance = function (distance) {
    if (Math.abs(distance) < 1000) {
        return `${distance} m`;
    }
    else {
        let formatted = (distance / 1000).toFixed(2);
        if (formatted.slice(-1) === "0") {
            formatted = formatted.slice(0, -1);
            if (formatted.slice(-1) === "0") {
                formatted = formatted.slice(0, -2);
            }
        }
        return `${formatted} km`;
    }
};
module.exports.formatDistance = formatDistance;
