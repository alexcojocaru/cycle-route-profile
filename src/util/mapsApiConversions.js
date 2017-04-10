/* global google:true*/

"use strict";

var _ = require("underscore");
const logger = require("../util/logger").logger("MapsApiConversions");
var hashFunction = require("./hash").hashPoints;
var TravelMode = require("../constant/routePlannerConstant").TravelMode;
var calculators = require("./routeCalculators");

/**
 * @desc convert a Google LatLng coordinate to an on-screen coordinate in pixels
 *   (relative to the top left corner of the window).
 *   The Google Maps API must be loaded for this function to work.
 * @param {google.maps.Map} map - the Google Map object
 * @param {google.maps.LatLng} coordinate - the Google LatLng coordinate
 * @return {google.maps.Point} - the screen coordinate
 */
var convertGoogleCoordinateToScreen = function (map, coordinate) {
    var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
    var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
    var scale = Math.pow(2, map.getZoom());
    var worldPoint = map.getProjection().fromLatLngToPoint(coordinate);
    var point = new google.maps.Point(
            (worldPoint.x - bottomLeft.x) * scale,
            (worldPoint.y - topRight.y) * scale
    );
    return point;
};
module.exports.convertGoogleCoordinateToScreen = convertGoogleCoordinateToScreen;

/**
 * @desc convert the given simple coordinate to an on-screen coordinate
 *     (relative to the top left corner of the window).
 *     The Google Maps API must be loaded for this function to work.
 * @param {google.maps.Map} map - the Google Map object
 * @param {object} coordinate - the simple coordinate in {lat, lng} format
 * @return {google.maps.Point} - the on-screen coordinate in pixels
 */
var convertSimpleCoordinateToScreen = function (map, coordinate) {
    return convertGoogleCoordinateToScreen(map, new google.maps.LatLng(coordinate));
};
module.exports.convertSimpleCoordinateToScreen = convertSimpleCoordinateToScreen;

/**
 * @desc convert the given Google coordinate to a simple coordinate
 *     The Google Maps API must be loaded for this function to work.
 * @param {google.maps.LatLng} coordinate - the Google LatLng coordinate
 * @return {object} - the simple coordinate in {lat, lng} format
 */
var convertGoogleCoordinateToSimple = function (coordinate) {
    return {
        lat: coordinate.lat(),
        lng: coordinate.lng()
    };
};
module.exports.convertGoogleCoordinateToSimple = convertGoogleCoordinateToSimple;

/**
 * @desc convert the given simple coordinate to a Google coordinate
 *     The Google Maps API must be loaded for this function to work.
 * @param {object} coordinate - the simple coordinate in {lat, lng} format
 * @return {google.maps.LatLng} - the Google LatLng coordinate
 */
var convertSimpleCoordinateToGoogle = function (coordinate) {
    return new google.maps.LatLng(coordinate);
};
module.exports.convertSimpleCoordinateToGoogle = convertSimpleCoordinateToGoogle;

/**
 * @desc convert the given screen location relative to the given map element
 *     to an absolute screen location (relative to the top left corner of the viewport).
 *     The Google Maps API must be loaded for this function to work.
 * @param {google.maps.MapElement} mapElement - the Google Map element
 * @param {google.maps.Point} relativeLocation - the on-screen location relative to the map
 * @return {google.maps.Point} - the on-screen location relative to the viewport
 */
var convertRelativeLocationToAbsolute = function (mapElement, relativeLocation) {
    // const mapRect = mapElement.getBoundingClientRect();
    return {
        // hmm... looks like I don't need to take the map position into account
        x: /* mapRect.left + */relativeLocation.x,
        y: /* mapRect.top + */relativeLocation.y
    };
};
module.exports.convertRelativeLocationToAbsolute = convertRelativeLocationToAbsolute;

/**
 * @desc convert the given Google coordinate to an absolute screen coordinate,
 *     relative to the top left corner of the viewport.
 *     The Google Maps API must be loaded for this function to work.
 * @param {google.maps.Map} map - the Google Map object
 * @param {google.maps.LatLng} coordinate - the Google LatLng coordinate
 * @return {google.maps.Point} - the on-screen coordinate relative to the viewport
 */
var convertGoogleCoordinateToAbsolute = function (map, coordinate) {
    return convertRelativeLocationToAbsolute(
            map.getDiv(),
            convertGoogleCoordinateToScreen(map, coordinate));
};
module.exports.convertGoogleCoordinateToAbsolute = convertGoogleCoordinateToAbsolute;

/**
 * @desc Convert the Google directions status to a human readable error message.
 *     The Google Maps API must be loaded for this function to work.
 * @param {google.maps.DirectionsStatus} status - the Google DirectionStatus
 * @return {string} - the direction status message
 */
var convertGoogleDirectionsStatus = function (status) {
    switch (status) {
        case google.maps.DirectionsStatus.INVALID_REQUEST:
            return "The webpage generated an invalid request," +
                    "most probably due to a bug on the page.";
        case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
            return "Too many Waypoints were provided in the Directions request." +
                    "The total allowed waypoints is 8, plus the origin and destination." +
                    "Maps API for Work customers are allowed 23 waypoints," +
                    "plus the origin, and destination.";
        case google.maps.DirectionsStatus.NOT_FOUND:
            return "At least one of the origin, destination, or waypoints" +
                    "could not be geocoded.";
        case google.maps.DirectionsStatus.OK:
            return "The directions request succeeded.";
        case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
            return "The API key has gone over the requests limit" +
                    "in too short a period of time.";
        case google.maps.DirectionsStatus.REQUEST_DENIED:
            return "The API key is not allowed to use the directions service.";
        case google.maps.DirectionsStatus.ZERO_RESULTS:
            return "No route could be found between the origin and destination.";
        case google.maps.DirectionsStatus.UNKNOWN_ERROR:
            return "A directions request could not be processed due to a server error." +
                    "The request may succeed if you try again.";
        default:
            return "An unknown directions service related error occurred.";
    }
};
module.exports.convertGoogleDirectionsStatus = convertGoogleDirectionsStatus;

/**
 * @descr convert a travel mode enum to a Google TravelMode string.
 *     The Google Maps API must be loaded for this function to work.
 * @param {TravelMode} travelMode - the simple travel mode to be converted to a travel mode
 *     enum of google.maps.TravelMode type
 * @return {google.maps.TravelMode} - the travel mode enum
 */
var convertSimpleTravelMode = function (travelMode) {
    switch (travelMode) {
        case TravelMode.ROAD:
            return google.maps.TravelMode.DRIVING;
        case TravelMode.WALK:
            return google.maps.TravelMode.WALKING;
        case TravelMode.BICYCLE:
            return google.maps.TravelMode.BICYCLING;
        default:
            logger.error(`Invalid travel mode: ${travelMode}; this shouldn't have happened`);
    }
};
module.exports.convertSimpleTravelMode = convertSimpleTravelMode;

/**
 * @descr convert a Google TravelMode to a travel mode enum
 *     The Google Maps API must be loaded for this function to work.
 * @param {google.maps.TravelMode} travelMode - the Google TravelMode value
 * @return {TravelMode} - the simple travel mode
 */
var convertGoogleTravelMode = function (travelMode) {
    switch (travelMode) {
        case google.maps.TravelMode.DRIVING:
            return TravelMode.ROAD;
        case google.maps.TravelMode.WALKING:
            return TravelMode.WALK;
        case google.maps.TravelMode.BICYCLING:
            return TravelMode.BICYCLE;
        default:
            logger.error(`Invalid travel mode: ${travelMode}; this shouldn't have happened`);
    }
};
module.exports.convertGoogleTravelMode = convertGoogleTravelMode;

/**
 * @descr convert the given list of simple waypoints to a list of Google waypoints.
 * @param {array} waypoints - the list of simple waypoints
 * @param {boolean} [stopover=false] - whether the points are stop over or not
 * @return {array} - an array of google.maps.DirectionsWaypoint objects
 */
var convertSimpleWaypointList = function (waypoints, stopover = false) {
    return _.map(
        waypoints,
        function (waypoint) {
            return {
                location: new google.maps.LatLng(waypoint),
                stopover: stopover
            };
        }
    );
};
module.exports.convertSimpleWaypointList = convertSimpleWaypointList;

/**
 * @descr convert the given list of Google waypoints to a list of simple waypoints.
 * @param {array} waypoints - the list of google.maps.LatLng waypoints
 * @return {array} - a list of simple waypoint objects as {lat, lng}
 */
var convertGoogleWaypointList = function (waypoints) {
    return _.map(waypoints, function (waypoint) {
        return {
            lat: waypoint.lat(),
            lng: waypoint.lng()
        };
    });
};
module.exports.convertGoogleWaypointList = convertGoogleWaypointList;

/**
 * @desc Build a simple route out of the given Google route
 * @param {object} googleRoute - the Google route
 * @return {object} - the simple route
 */
var convertGoogleRoute = function (googleRoute) {
    const distance = calculators.totalDistance(googleRoute);
    const points = calculators.mergeRouteLegs(googleRoute);
    const path = googleRoute.overview_polyline;
    const route = {
        points: points,
        hash: hashFunction(points),
        distance: distance,
        path: path
    };
    return route;
};
module.exports.convertGoogleRoute = convertGoogleRoute;
