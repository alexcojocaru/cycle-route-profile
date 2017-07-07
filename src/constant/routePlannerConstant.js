"use strict";

var keyMirror = require("fbjs/lib/keyMirror");

var TravelMode = keyMirror({
    ROAD: null,
    WALK: null,
    BICYCLE: null
});
module.exports.TravelMode = TravelMode;

var EndpointType = keyMirror({
    START: null,
    WAYPOINT: null,
    FINISH: null
});
module.exports.EndpointType = EndpointType;

module.exports.TravelModeLabel = {
    ROAD: "Follow road (drive mode)",
    WALK: "On and Off road (walk mode)",
    BICYCLE: "Bicycling layer"
};
