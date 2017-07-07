"use strict";

const _ = require("underscore");

const logger = require("./logger").logger("ElevationParsers");


/**
 * @typedef {object} chartPoint
 * @property {number} x - the x coordinate (eg. the distance to the first point)
 * @property {number} y - the y coordinate (eg. the point elevation)
 */

/**
 * @typedef {object} closestPoint
 * @property {point} point - the closest point; can be null
 * @property {number} index - the index of the closest point in the points list (or -1 for no point)
 */

/**
 * @desc Calculate the distance between two adjacent points, assuming they are equidistant.
 * @param {number} totalDistance - the total distance
 * @param {number} pointsCount - the number of segments within the given distance
 * @return {number} - the distance between two points
 */
module.exports.pointDistance = function (totalDistance, pointsCount) {
    return totalDistance / (pointsCount - 1);
};

/**
 * @desc Build the elevation data to display on the chart.
 * @param {point[]} points - a list of points with elevation
 * @param {number} pointDistance - the distance between two adjacent points
 * @return {chartPoint[]} - the elevation data
 */
module.exports.buildElevationData = function (points, pointDistance) {
    const elevationData = _.map(points, (point, index) => {
        return { x: index * pointDistance, y: point.ele }
    });

    logger.trace("elevations to plot:", elevationData);

    return elevationData;
};

/**
 * @desc Build the grade list for the given list of points.
 * @param {point[]} points - a list of points with elevation
 * @param {number} pointDistance - the distance between two adjacent points
 * @return {number[]} - the grade list
 */
module.exports.buildGradesList = function (points, pointDistance) {
    let previous;
    const grades = _.map(points, (point, index) => {
        // first point doesn't have a grade
        const grade = index === 0 ? 0 : (100 * (point.ele - previous.ele) / pointDistance);

        previous = point;
        
        return grade;
    });
    
    logger.trace("grades:", grades);

    return grades;
};

/**
 * @desc Build the chart fill colors list. Since the first grade in the given grades list is 0,
 *    the fill colors are shifted to the left by 1, compared to the grades
 *    (eg. the fill color for point n on the chart is the color of the grade for point n+1).
 *    For completeness, one extra color (corresponding to grade 0) is added to the resulting list.
 * @param {number[]} grades - the list of grades
 * @return {string[]} - the chart fill colors
 */
module.exports.buildBackgroundColorList = function (grades) {
    const gradeColors = {
        // 9% and above grade
        a9: '#ff0000',
        // 6% and above grade
        a6: '#ffc000',
        // 3% and above grade
        a3: '#fff000',
        // flat-ish
        a0: '#00ff00',
        // -3% and above grade
        am3: '#00ffd8',
        // -6% and above grade
        am6: '#00ccff',
        // below -6% grade
        am: '#0000ff'
    };

    const backgroundColors = _.map(_.rest(grades), grade => {
        let color;

        if (grade >= 9) {
            color = gradeColors.a9;
        }
        else if (grade >= 6) {
            color = gradeColors.a6;
        }
        else if (grade >= 3) {
            color = gradeColors.a3;
        }
        else if (grade >= 0) {
            color = gradeColors.a0;
        }
        else if (grade >= -3) {
            color = gradeColors.am3;
        }
        else if (grade >= -6) {
            color = gradeColors.am6;
        }
        else {
            color = gradeColors.am;
        }

        return color;
    });

    // add one more color, for completeness (it will never be used on the chart)
    backgroundColors.push(gradeColors.a0);

    logger.trace("background colors to use for filling:", backgroundColors);

    return backgroundColors;
};

/**
 * @desc Calculate the most appropriate step size on the distance axis.
 * @param {number} distance - the total distance
 * @param {number} minTicks - min number of ticks (or gridlines) to have on the distance axis.
 * @return {number} - the step size
 */
module.exports.calculateDistanceStepSize = function (distance, minTicks) {
    const availableStepSize = [
        100000,
        50000,
        25000,
        20000,
        10000,
        5000,
        2500,
        2000,
        1000,
        500
    ];

    let stepSize;
    
    // the last one is used implicitly if none of the previous ones match
    for (let stepSizeIndex = 0; stepSizeIndex < availableStepSize.length; stepSizeIndex++) {
        stepSize = availableStepSize[stepSizeIndex];
        if (distance / stepSize > minTicks) {
            break;
        }
    }

    logger.trace("Calculated step size:", stepSize,
            "for distance", distance,
            "and min ticks", minTicks);

    return stepSize;
}

/**
 * @desc Convert the distance to kilometers and format it with a single decimal.
 * @param {number} distance - the distance in meters
 * @return {string} - the formatted distance in kilometers
 */
module.exports.formatDistance = function (distance) {
    return Math.round(distance / 100) / 10;
};

/**
 * Find the point in the points list closest to the given point.
 * @param {point[]} points - a list of points
 * @param {point} point - to target point
 * @return {closestPoint} - the closest point, or null if the given list is empty
 *    or the target point is null, along with its index in the given points list
 */
module.exports.findClosestPoint = function (points, point) {
    if (point === null) {
        return {
            point: null,
            index: -1
        };
    }

    let closestPointIndex = -1;
    let closestDistance = -1;

    _.each(points, (currentPoint, index) => {
        const distance = Math.sqrt(
                Math.pow(currentPoint.lat - point.lat, 2) +
                Math.pow(currentPoint.lng - point.lng, 2));
        if (closestDistance === -1 || distance < closestDistance) {
            closestDistance = distance;
            closestPointIndex = index;
        }
    });

    return {
        point: closestPointIndex > -1 ? points[closestPointIndex] : null,
        index: closestPointIndex
    };
};
