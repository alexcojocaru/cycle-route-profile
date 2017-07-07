/* global google:true*/

"use strict";

var _ = require("underscore");

var EndpointType = require("../constant/routePlannerConstant").EndpointType;
var conversions = require("../util/mapsApiConversions");

/**
 * @desc Create a new Google map.
 *   The Google Maps API must be loaded for this function to work.
 * @param {DOMNode} mapElement - the DOM node to set the map to
 * @return {google.maps.Map} - the newly created map
 */
const newMap = function (mapElement) {
    const map = new google.maps.Map(mapElement, {
        center: { lat: 49.2956, lng: -123.1174 },
        mapTypeControl: true,
        mapTypeControlOptions: {
            mapTypeIds: [
                google.maps.MapTypeId.ROADMAP,
                google.maps.MapTypeId.SATELLITE,
                google.maps.MapTypeId.TERRAIN
            ],
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            position: google.maps.ControlPosition.LEFT_TOP
        },
        zoomControl: true,
        zoom: 10,
        minZoom: 4,
        maxZoom: 19,
        scaleControl: true,
        scaleControlOptions: {
            style: google.maps.ScaleControlStyle.DEFAULT
        },
        streetViewControl: false
    });

    return map;
};
module.exports.newMap = newMap;

/**
 * @desc Create a new marker of the given type.
 *   The Google Maps API must be loaded for this function to work.
 * @param {string} endpointType - the endpoint type for the new marker
 * @param {google.maps.Map} map - the google map object to create the marker on
 * @return {google.maps.Marker} - the newly created marker
 */
const newMarker = function (endpointType, map) {
    let url, title, size, zIndex, origin, anchor;
    switch (endpointType) {
        case EndpointType.START:
            url = "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=A|00D900";
            title = "Start";
            size = new google.maps.Size(21, 34);
            origin = new google.maps.Point(0, 0);
            anchor = new google.maps.Point(10, 34);
            zIndex = -1;
            break;
        case EndpointType.WAYPOINT:
            url = "https://maps.gstatic.com/mapfiles/dd-via.png";
            title = null;
            size = new google.maps.Size(11, 11);
            origin = new google.maps.Point(0, 0);
            anchor = new google.maps.Point(5, 5);
            zIndex = 100;
            break;
        case EndpointType.FINISH:
            url = "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=B|F9645A";
            title = "Finish";
            size = new google.maps.Size(21, 34);
            origin = new google.maps.Point(0, 0);
            anchor = new google.maps.Point(10, 34);
            zIndex = -1;
            break;
        default:
    }

    const marker = new google.maps.Marker({
        map: map,
        icon: {
            url: url,
            size: size,
            origin: origin,
            anchor: anchor
        },
        title: title,
        draggable: false,
        visible: false,
        zIndex: zIndex
    });

    return marker;
};
module.exports.newMarker = newMarker;

/**
 * @desc Create a new DirectionsRequest.
 *   The Google Maps API must be loaded for this function to work.
 * @param {route} route - the route to get the directions for
 * @param {TravelMode} travelMode - the simple travel mode to use for routing
 * @return {google.maps.DirectionsRequest} - the directions request
 */
const newDirectionsRequest = function (route, travelMode) {
    const start = new google.maps.LatLng(_.first(route.points));
    const finish = new google.maps.LatLng(_.last(route.points));
    const waypoints = conversions.convertSimpleWaypointList(_.initial(_.rest(route.points)));
    const googleTravelMode = conversions.convertSimpleTravelMode(travelMode);

    return {
        origin: start,
        destination: finish,
        waypoints: waypoints,
        avoidTolls: true,
        avoidHighways: true,
        optimizeWaypoints: false,
        unitSystem: google.maps.UnitSystem.METRIC,
        travelMode: googleTravelMode
    };
};
module.exports.newDirectionsRequest = newDirectionsRequest;

/**
 * @desc Create a new directions renderer options object.
 * @param {google.maps.Map} map - the map to render on
 * @param {boolean} preserveViewport - whether to preserve the viewport when rendering the route
 * @param {boolean} draggable - whether to allow the route points to be dragged
 * @return {google.maps.DirectionsRendererOptions} - the directions renderer options
 */
const newDirectionsRendererOptions = function (map, preserveViewport, draggable) {
    return {
        map: map,
        draggable: draggable,
        hideRouteList: true,
        suppressInfoWindows: true,
        preserveViewport: preserveViewport,
        // all markers (start/finish points) use the waypoint icon;
        // the first start and last finish will be marked by separate markers
        markerOptions: {
            icon: {
                url: "https://maps.gstatic.com/mapfiles/dd-via.png",
                size: new google.maps.Size(11, 11),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(5, 5)
            }
        }
    };
};
module.exports.newDirectionsRendererOptions = newDirectionsRendererOptions;

/**
 * Build a new path on the given map, invisible and with an empty point list.
 * @param {google.maps.Map} map - the map to render on
 * @return {google.maps.Polyline} - the new path
 */
module.exports.newPath = function (map) {
    return new google.maps.Polyline({
        path: [],
        map: map,
        // clickable: false,
        visible: false,
        strokeOpacity: 0,
        strokeWeight: 1, // 23 is the width of the gogle route
        strokeColor: "red",
        zIndex: -1
    });
};

/**
 * Update the given path with the points on the given route, and make it visible.
 * The given route is considered to have a single leg.
 * @param {google.maps.Polyline} path - the path to update
 * @param {google.maps.DirectionsRoute} routes - the route with points to set on the path
 */
module.exports.updatePath = function (path, route) {
    const routePoints = [];
    _.each(route.legs[0].steps, step => {
        _.each(step.lat_lngs, lat_lng => routePoints.push(lat_lng));
    });
    path.setPath(routePoints);
    path.setVisible(true);
};
