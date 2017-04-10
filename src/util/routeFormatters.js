/* global google:true*/

"use strict";

const _ = require("underscore");

/**
 * @descr Format the given distance to a human readable value
 * @param {number} distance - the distance in meters
 * @return {string} - the distance in meters or kilometers, including the unit
 */
const formatDistance = function (distance) {
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

/**
 * @desc Format the given routes as a Blob with GPX content.
 * @param {route[]} routes - the routes to format
 * @return {Blob} - the GPX content as Blog
 */
const routesToGpx = function (routes) {
    const content = new Array();
    content.push(
`<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
<metadata>
  <copyright author="cycle-route-profile">
    <year>${new Date().getFullYear()}</year>
    <license>CC-BY-SA</license>
  </copyright>
</metadata>`
    );

    _.each(routes, function (route, index) {
        content.push(
`
<trk>
  <trkseg> 
    <name>Track ${index}</name>`
        );

        const points = google.maps.geometry.encoding.decodePath(route.path);
        _.each(points, function (point) {
            content.push(
                // TODO elevations
`
    <trkpt lat="${point.lat()}" lon="${point.lng()}" />`
            );
        });

        content.push(
`
  </trkseg>
</trk>`
        );
    });

    content.push(
`
</gpx>`
    );
    const blob = new Blob(
        content,
        {
            type: "application/gpx+xml;charset=utf-8",
            endings: "native"
        }
    );
    return blob;
};
module.exports.routesToGpx = routesToGpx;
