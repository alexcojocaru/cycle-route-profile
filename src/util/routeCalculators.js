"use strict";

const _ = require("underscore");
const conversions = require("./mapsApiConversions");

const isWaypointWithinBounds = function (map, mapRect, waypoint, mouseEvent) {
    const waypointPosition = conversions.convertSimpleCoordinateToScreen(map, waypoint);

    // calculate the distance from the location of the event to the current waypoint;
    // the waypoint position is within the map bounds,
    // whereas the mouse event position is within the window bounds
    const distance = Math.sqrt(
        Math.pow(waypointPosition.x + mapRect.left - mouseEvent.clientX, 2) +
        Math.pow(waypointPosition.y + mapRect.top - mouseEvent.clientY, 2)
    );

    return distance <= 5; // this is the radius (in pixels) of the waypoint marker
};

/**
 * @descr find the waypoint (not global start, nor global finish)
 *    within a 5px radius of the given mouse event location
 * @param {google.maps.Map} map - the Google Map object
 * @param {array} routes - the list of routes to search
 * @param {MouseEvent} mouseEvent - the Google mouse event
 * @return {object} - the first waypoint within range or null
 */
const findWaypointWithinBounds = function (map, routes, mouseEvent) {
    // all waypoints (except for the global start and finish points) into a flat array
    const waypoints = _.initial(_.rest(
        _.flatten(_.pluck(routes, "points"))
    ));

    const mapRect = map.getDiv().getBoundingClientRect();

    const result = _.find(
        waypoints,
        waypoint => isWaypointWithinBounds(map, mapRect, waypoint, mouseEvent)
    );

    return result;
};
module.exports.findWaypointWithinBounds = findWaypointWithinBounds;

/**
 * @descr Merge the waypoints on the given route legs into a single list of simple waypoints.
 *     The Google Maps API must be loaded for this function to work.
 * @param {google.maps.DirectionsRoute} route - a google route
 * @return {array} - a list of simple waypoint objects as {lat, lng}
 */
const mergeRouteLegs = function (route) {
    const waypoints = [];
    _.each(route.legs, leg => {
        // don't add the start if it's equal to the previous finish
        if (!leg.start_location.equals(_.last(waypoints))) {
            waypoints.push(leg.start_location);
        }

        _.each(leg.via_waypoints, waypoint => waypoints.push(waypoint));

        waypoints.push(leg.end_location);
    });

    // convert from google.maps.LatLng to {lat, lng} objects
    const simpleWaypoints = conversions.convertGoogleWaypointList(waypoints);

    return simpleWaypoints;
};
module.exports.mergeRouteLegs = mergeRouteLegs;

/**
 * @descr Calculate the total distance between all the legs of the given route.
 * @param {google.maps.DirectionsRoute} route - a google route
 * @return {number} - the total distance in meters
 */
const totalDistance = function (route) {
    const overallDistance = _.reduce(
        route.legs,
        (distance, leg) => {
            const currentDistance = leg.distance ? leg.distance.value : 0;
            return distance + currentDistance;
        },
        0
    );
    return overallDistance;
};
module.exports.totalDistance = totalDistance;

