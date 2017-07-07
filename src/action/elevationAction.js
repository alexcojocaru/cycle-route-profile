/* global google:true*/
"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const _ = require("underscore");

const FetchStatus = require("../constant/elevationConstant").FetchStatus;
const notificationAction = require("./notificationAction");
const NotificationLevel = require("../constant/notificationConstant").Level;
const logger = require("../util/logger").logger("ElevationAction");
const conversions = require("../util/mapsApiConversions");
const parsers = require("../util/routeParsers");

/*
 * The Elevation APIs limitations are:
 * - 2,500 free requests per day
 * - 512 locations per request
 * - 50 requests per second
 */

const Types = keyMirror({
    UPDATE_STATUS: null
});
module.exports.Types = Types;

const updateStatus = function (status, message) {
    return {
        type: Types.UPDATE_STATUS,
        value: status,
        message: message
    };
};
module.exports.updateStatus = updateStatus;


/**
 * @desc Dispatch the notifications for fetching elevations for new points.
 * @param {function} dispatch - the dispatch function
 */
const dispatchFetchAlongPathProgressNotifications = function (dispatch) {
    dispatch(updateStatus(FetchStatus.RUNNING));

    // dispatch a sticky notification action
    dispatch(notificationAction.addNotification(
        NotificationLevel.INFO,
        "Fetching elevation coordinates",
        "The route cannot be modified while the elevation coordinates are being updated.",
        "FETCH_ELEVATIONS"));
};

/**
 * @desc Dispatch the notifications for fetching elevations for new points.
 * @param {function} dispatch - the dispatch function
 * @param {number} lowerBound - the index of the first point in the batch being fetched
 * @param {number} pointsCount - the total number of points to fetch
 */
const dispatchFetchForLocationsProgressNotifications = function (dispatch, lowerBound, pointsCount)
{
    dispatch(updateStatus(FetchStatus.RUNNING));

    // dispatch a sticky notification action
    dispatch(notificationAction.addNotification(
        NotificationLevel.INFO,
        `Fetching the complete elevation coordinates - ${
            Math.round(lowerBound * 100 / pointsCount)
        }% complete`,
        "The route cannot be modified while the elevation coordinates are being updated.",
        "FETCH_ELEVATIONS"));
};

/**
 * @desc Dispatch the success notifications after all point elevations have been fetched.
 * @param {function} dispatch - the dispatch function
 */
const dispatchSuccessNotifications = function (dispatch) {
    // discard the sticky notification
    dispatch(notificationAction.dismissNotification("FETCH_ELEVATIONS"));

    dispatch(updateStatus(FetchStatus.SUCCESS));
};

/**
 * @desc Dispatch the notifications around getting an elevation fetch.
 * @param {function} dispatch - the dispatch function
 * @param {string} errorMessage - the error message
 */
const dispatchErrorNotifications = function (dispatch, errorMessage) {
    // discard the sticky notification
    dispatch(notificationAction.dismissNotification("FETCH_ELEVATIONS"));

    const message = errorMessage
            ? `The Google elevation API returned an error while requesting elevation coordinates.
Error message: ${errorMessage}`
            : "There was an error while requesting elevation coodrinates. See the log for details";

    dispatch(notificationAction.addNotification(
        NotificationLevel.ERROR,
        "Fetching elevation coordinates",
        message));

    dispatch(updateStatus(FetchStatus.ERROR, errorMessage));
};


/**
 * @desc Map the given results (which correspond to a path) to a list of pointWithDistance points.
 *     The given results are considered to be equidistant.
 * @param {google.maps.ElevationResult[]} results - the response of the get elevations request
 *     (they are equidistant along the path)
 * @param {number} pathLength - the length of the path being mapped
 * @param {number} baseLength - the length between the global origin
 *     and the origin of the path being maped
 * @return {pointWithDistance[]} - the list of points with distance and elevation,
 *     corresponding to the given results
 */
const mapEquidistantPointsWithElevation = function (results, pathLength, baseLength) {
    const legLength = pathLength / (results.length - 1);
    return _.map(results, (result, index) => {
        return {
            lat: result.location.lat(),
            lng: result.location.lng(),
            ele: Math.round(result.elevation * 100) / 100,
            dist: baseLength + Math.round(legLength * index)
        };
    });
};

/**
 * @desc Map the given points (which correspond to a path) to a list of pointWithDistance points.
 *     The points on the path are considered to be equidistant.
 *     The elevation attribute is not set on the results.
 * @param {point[]} points - the points to map
 * @param {number} pathLength - the length of the path being mapped
 * @param {number} baseLength - the length between the global origin
 *     and the origin of the path being maped
 * @return {pointWithDistance[]} - the list of points with distance,
 *     corresponding to the given points.
 */
const mapEquidistantPoints = function (points, pathLength, baseLength) {
    const legLength = pathLength / (points.length - 1);
    return _.map(points, (point, index) => {
        return {
            lat: point.lat,
            lng: point.lng,
            dist: baseLength + Math.round(legLength * index)
        };
    });
};

/**
 * @desc Build a chainable promise which fetched the elevation coordinate along the given path.
 * @param {google.maps.ElevationService} elevationSvc - the elevation service
 * @param {pathWithDistance[]} pathWithDistance - the paths (with total distance information)
 * @return {function} - a function which returns a promise
 */
const buildFetchAlongPathPromise = function (elevationSvc, pathWithDistance) {
    return function (elevations) {
        return new Promise(function (resolve, reject) { // eslint-disable-line no-unused-vars
            logger.trace("Sending getElevationAlongPath request for path:", pathWithDistance);

            elevationSvc.getElevationAlongPath({
                path: _.map(
                    pathWithDistance.path,
                    point => conversions.convertAndRoundSimpleCoordinateToGoogle(point)
                ),
                samples: 512
            }, function (results, status) {
                logger.trace(
                        "Received getElevationAlongPath response",
                        "; status:", status,
                        "; results:", results);

                const baseDistance = _.isEmpty(elevations) ? 0 : _.last(elevations).dist;

                let pathElevations;
                if (status === google.maps.ElevationStatus.OK) {
                    pathElevations = mapEquidistantPointsWithElevation(
                        results,
                        pathWithDistance.distance,
                        baseDistance
                    );
                }
                else {
                    logger.error("The getElevationAlongPath request for path:", pathWithDistance,
                            "failed with status:", status, "and results:", results);

                    pathElevations = mapEquidistantPoints(
                        pathWithDistance.path,
                        pathWithDistance.distance,
                        baseDistance
                    );
                }

                const newElevations = [...elevations, ...pathElevations];
      
                logger.trace("Finished processing path:", pathWithDistance,
                        "; elevations:", newElevations);
        
                setTimeout(() => resolve(newElevations), 1000);
            });
        });
    };
};

/**
 * @desc Fetch the elevation coordinates along the given paths.
 *     A separate request is made for each path.
 *     The reason for not concatenating the paths is that
 *     each path has a variable number of points and a distance, and I need to know the distance
 *     between the samples, in order to plot the elevation chart correctly.
 * @param {pathWithDistance[]} pathWithDistanceLists - the list of paths with distances
 * @param {string} token - a unique token to be passed back to the action creator
 * @param {function} callback - once the elevation data has been fetched, a message generated
 *     by the callback function (which is called with the given token
 *     and the elevations array as param) is dispatched
 * @return {function} - an action
 */
module.exports.fetchAlongPath = function (pathWithDistanceLists, token, callback) {
    logger.debug("Fetching along paths:", pathWithDistanceLists, "; token:", token);

    return function (dispatch) {
        dispatchFetchAlongPathProgressNotifications(dispatch);

        const elevationSvc = new google.maps.ElevationService();
        let promise = Promise.resolve([]);

        // chain a promise for each path
        _.each(
            pathWithDistanceLists,
            pathWithDistance => {
                logger.trace("Creating promise for path:", pathWithDistance);
                promise = promise.then(buildFetchAlongPathPromise(elevationSvc, pathWithDistance));
                logger.trace("Finished creating promise for path:", pathWithDistance);
            }
        );

        promise.then(function (elevations) {
            logger.debug("Successfully fetched along paths");
            dispatchSuccessNotifications(dispatch);
            dispatch(callback(token, elevations));
        }).catch(function (reason) {
            logger.error(
                "Could not fetch elevations along paths:", pathWithDistanceLists,
                "; reason:", reason
            );
            dispatchErrorNotifications(dispatch);
        });
    };
};


/**
 * @desc Whether the given elevation result is close enough to the given point
 *     and its elevation coordinate can be used.
 * @param {google.maps.ElevationResult} elevationResult - an elevation result
 * @param {point} point - a point
 * @return {boolean} - whether the elevation result is close enough to the given point or not
 */
const allowElevationResult = function (elevationResult, point) {
    // compare the latitude and longitude of the current result and point;
    // they should match to the (and including) 5th decimal
    // (that's the rough equivalent of 1.1 meters).
    const resultLat = elevationResult.location.lat();
    const resultLng = elevationResult.location.lng();

    const roundFactor = Math.pow(10, 5);

    let allow;
    if (Math.round(resultLat * roundFactor) !== Math.round(point.lat * roundFactor) ||
           Math.round(resultLng * roundFactor) !== Math.round(point.lng * roundFactor)) {
        logger.warn(
                `Coordinates don't match for the given point and the corresponding result; point={${
                    point.lat
                }, ${
                    point.lng
                }, result={${
                    resultLat
                }, ${
                    resultLng
                }}`);
        allow = false;
    }
    else {
        allow = true;
    }
    return allow;
};

/**
 * @desc Given a points list, find the last point with elevation in the list.
 *     If no such point exists, make one up with the lat,lng coordinates
 *     of the last one in the list.
 * @param {point[]} points - the points list (must be not empty)
 * @return {point} - the last point with elevation, or a mock one without elevation
 */
const findLastPointWithElevation = function (points) {
    // find the last point with elevation
    let result = _.find(points.slice().reverse(), p => p.ele !== null);

    if (typeof result === "undefined") {
        const last = _.last(points);
        result = {
            lat: last.lat,
            lng: last.lng,
            dist: last.dist
        };
    }

    return result;
};

/**
 * @desc Map the given points to a list of points with elevation data, extracted from
 *     the given elevation query results.
 *     It is considered to be a 1-to-1 mapping between the points and the results.
 * @param {point[]} points - the points to map
 * @param {google.maps.ElevationResult[]} results - the elevation query results for the given points
 * @param {point} basePoint - the point to be used to calculate the base distance;
 *     it can be null only if this is the first partition to be processed
 * @return {point[]} - a list of points with elevation coordinate
 */
const mapPointsWithElevation = function (points, results, basePoint) {
    // old school iteration, just because I need access to the previously computed elements
    const pointsWithElevation = [];
    _.each(points, (point, index) => {
        const result = results[index];
        const elevation = allowElevationResult(result, point) ? result.elevation.toFixed(2) : null;
        const pointWithElevation = {
            lat: point.lat,
            lng: point.lng,
            ele: elevation
        };

        let distance;
        if (index === 0 && !basePoint) {
            distance = 0;
        }
        else if (index === 0) {
            distance = basePoint.dist + parsers.calculate3dDistance(basePoint, pointWithElevation);
        }
        else {
            const prev = findLastPointWithElevation(_.first(pointsWithElevation, index));
            distance = prev.dist + parsers.calculate3dDistance(prev, pointWithElevation);
        }

        pointWithElevation.dist = distance;

        pointsWithElevation.push(pointWithElevation);
    });

    return pointsWithElevation;
};

/**
 * @desc Build a chainable promise which fetched the elevation coordinate for all points
 *     on the given path.
 * @param {google.maps.ElevationService} elevationSvc - the elevation service
 * @param {point[]} points - the points to fetch elevations for
 * @param {function} onStart - function to call with the index of the current partition
 *     being processed when the promise starts executing
 * @return {function} - a function which returns a promise
 */
const buildFetchForLocationsPromise = function (elevationSvc, points, onStart) {
    return function (elevations) {
        return new Promise(function (resolve, reject) {
            onStart();

            logger.trace("Sending getElevationForLocations request for locations:", points);
            
            elevationSvc.getElevationForLocations({
                locations: _.map(
                    points,
                    point => conversions.convertAndRoundSimpleCoordinateToGoogle(point)
                )
            }, function (results, status) {
                logger.trace(
                        "Received getElevationForLocations response",
                        "; status:", status,
                        "; results:", results);

                if (status === google.maps.ElevationStatus.OK) {
                    const basePoint = _.isEmpty(elevations)
                            ? null
                            : findLastPointWithElevation(elevations);
                    const pathElevations = mapPointsWithElevation(points, results, basePoint);
                    const newElevations = [...elevations, ...pathElevations];
          
                    logger.trace("Finished processing locations:", points,
                            "; elevations:", newElevations);
            
                    setTimeout(() => resolve(newElevations), 1000);
                }
                else {
                    logger.error(
                            "The getElevationForLocations request for locations:", points,
                            "failed with status:", status, "and results:", results
                    );

                    reject(status);
                }
            });
        });
    };
};

/**
 * @desc Fetch the elevation coordinates for the given points.
 * @param {point[]} points - the points
 * @param {string} token - a unique token to be passed back to the action creator
 * @param {function} callback - once the elevation data has been fetched, a message generated
 *     by the callback function (which is called with the given token
 *     and the elevations array as param) is dispatched
 * @return {function} - an action
 */
module.exports.fetchForLocations = function (points, token, callback) {
    logger.debug("Fetching for locations:", points);

    const partitionSize = 100;
    const partitionCount = Math.ceil(points.length / partitionSize);

    return function (dispatch) {
        const elevationSvc = new google.maps.ElevationService();
        let promise = Promise.resolve([]);

        _.each(
            _.chain(points)
                .groupBy(function (point, index) {
                    return Math.floor(index / partitionSize);
                })
                .toArray()
                .value(),
            (partition, index) => {
                logger.trace("Creating promise for partition:", partition);

                promise = promise.then(
                    buildFetchForLocationsPromise(
                        elevationSvc,
                        partition,
                        _.partial(
                            dispatchFetchForLocationsProgressNotifications,
                            dispatch,
                            index,
                            partitionCount
                        )
                    )
                );
                logger.trace("Finished creating promise for partition:", partition);
            }
        );

        promise.then(function (elevations) {
            logger.debug("Successfully fetched elevations for locations");
            dispatchSuccessNotifications(dispatch);
            dispatch(callback(token, elevations));
        }).catch(function (reason) {
            logger.error(
                "Could not fetch elevations for locations:", points,
                "; reason:", reason
            );
            dispatchErrorNotifications(dispatch);
            dispatch(callback(token, null));
        });
    };
};
