"use strict";

var TravelMode = require("../constant/routePlannerConstant").TravelMode;

/**
 * @desc Validate the travel mode property. The property is optional.
 * @param {object} props - the properties
 * @param {string} propName - the name of the travel mode property
 */
module.exports.TravelModePropValidator = function (props, propName) {
    var mode = props[propName];

    // allow undefined
    if (Boolean(mode) && !TravelMode.hasOwnProperty(mode)) {
//        return new Error("Validation failed!");
    }
};
