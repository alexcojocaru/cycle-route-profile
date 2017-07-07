"use strict";

const _ = require("underscore");
const logger = require("../util/logger").logger("RouteFormatters");

/**
 * @descr Format the given distance to a human readable value.
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
 * @descr Format the given distance to kilometers with two decimals.
 * @param {number} distance - the distance in meters
 * @return {string} - the distance in kilometers, with two decimals, excluding the unit
 */
const formatDistanceToKmWithTwoDecimals = function (distance) {
    return (distance / 1000).toFixed(2);
};
module.exports.formatDistanceToKmWithTwoDecimals = formatDistanceToKmWithTwoDecimals;

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

/**
 * @desc Pad the given string with spaces at the left, to the given fixed length.
 * @param {number} length - the desired string length
 * @param {string} str - the string to format
 * @return {string} - a new string of the given length
 */
const padStringToFixedLength = function (length, str) {
    return (" ".repeat(length) + str).slice(-length);
};
module.exports.padStringToFixedLength = padStringToFixedLength;

/**
 * @desc Pad the given string with the given number of spaces at the left.
 * @param {number} length - the number of spaces to add to the left
 * @param {string} str - the string to format
 * @return {string} - a new string
 */
const padString = function (length, str) {
    return (" ".repeat(length) + str).slice(-length);
};
module.exports.padString = padString;

/**
 * @typedef {object} routeInstruction
 * @property {string} instructions - the instructions for a given step
 * @property {number} distance - the distance of the given step
 */

/**
 * @desc Build the route sheet for the given route instructions.
 * @param {routeInstruction[]} directions - the route instructions
 * @return {string} - the formatted route sheet
 */
module.exports.routeInstructionsToRouteSheeet = function (directions) {
    // The int. distance are shifted down by one compared to the instructions.

    const routeSheet = new Array();
    let cumulativeDistance = 0;
    let intermediateDistance = 0;

    _.each(directions, direction => {
        cumulativeDistance += intermediateDistance;

        const step = {
            distCum: cumulativeDistance,
            distInt: intermediateDistance,
            instructions: direction.instructions
        };
        routeSheet.push(step);

        logger.trace("Generated route sheet step:", step, "for instruction:", direction);

        // the int. distance goes on the next step
        intermediateDistance = direction.distance;
    });

    // Add one more instruction: ARRIVEE for the last int. distance.
    if (intermediateDistance != 0) {
        cumulativeDistance += intermediateDistance;
        routeSheet.push({
            distCum: cumulativeDistance,
            distInt: intermediateDistance,
            instructions: "ARRIVEE"
        });
    }


    const content = new Array();
    content.push(`Dist(cum.)     Dist(int.)     Instruction`);
    _.each(routeSheet, step => {
        content.push("\n");

        content.push(padStringToFixedLength(10, formatDistanceToKmWithTwoDecimals(step.distCum)));

        content.push(" ".repeat(5));

        content.push(padStringToFixedLength(10, formatDistanceToKmWithTwoDecimals(step.distInt)));

        content.push(" ".repeat(5));

        const instructions = step.instructions
                .replace(/\<br\s?\\?\>/g, "; ") // replace all br's with semicolon-space
                .replace(/\<div.*\>/g, "") // replace all start divs with semicolon-space
                .replace(/\<\/?\w+\s?\\?\>/g, ""); // remove all start/end/full tags
        content.push(instructions);
    });

    const blob = new Blob(
        content,
        {
            type: "text/plain;charset=utf-8",
            endings: "native"
        }
    );
    return blob;
};
