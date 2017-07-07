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
 * @desc Format the given points list as a Blob with GPX content.
 * @param {point[]} points - the points list to format
 * @return {Blob} - the GPX content as Blog
 */
const pointListToGpx = function (points) {
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

    const date = new Date().toISOString();
    const datetime = `${date.slice(0, 10)} ${date.slice(11, 19)}`; // 2017-05-13 12:12:59
    content.push(
`
<trk>
  <trkseg> 
    <name>Track ${datetime}</name>`
    );

    _.each(points, point => {
        content.push(
`
    <trkpt lat="${point.lat}" lon="${point.lng}"`
        );
        if (_.has(point, "ele") && point.ele !== null) {
            content.push(` ele="${point.ele}"`);
        }
        content.push(" />");
    });

    content.push(
`
  </trkseg>
</trk>`
    );

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
module.exports.pointListToGpx = pointListToGpx;
