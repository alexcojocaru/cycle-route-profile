/* global google:true*/
"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const _ = require("underscore");

const FetchStatus = require("../constant/elevationConstant").FetchStatus;
const notificationAction = require("./notificationAction");
const NotificationLevel = require("../constant/notificationConstant").Level;
const routePlannerAction = require("./routePlannerAction");
const logger = require("../util/logger").logger("ElevationAction");
const conversions = require("../util/mapsApiConversions");

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
 * @param {google.maps.ElevationResult[]} results - the response of the get elevations request
 * @param {number} pathDistance - the distance of the path being mapped
 * @param {number} baseDistance - the distance between the global origin
 *     and the origin of the path being maped
 * @return {pointWithDistance[]} - the list of points with distance and elevation,
 *     corresponding to the given results
 */
const mapToPointsWithElevationAndDistance = function (results, pathDistance, baseDistance) {
    const legDistance = pathDistance / (results.length - 1);
    return _.map(results, (result, index) => {
        return {
            lat: result.location.lat(),
            lng: result.location.lng(),
            ele: Math.round(result.elevation * 100) / 100,
            dist: baseDistance + Math.round(legDistance * index)
        };
    });
};

/**
 * @desc Map the given points (which correspond to a path) to a list of pointWithDistance points.
 *     The points on the path are considered to be equidistant.
 *     The elevation attribute is not set on the results.
 * @param {point[]} points - the points to map
 * @param {number} pathDistance - the distance of the path being mapped
 * @param {number} baseDistance - the distance between the global origin
 *     and the origin of the path being maped
 * @return {pointWithDistance[]} - the list of points with distance,
 *     corresponding to the given points.
 */
const mapToPointsWithDistance = function (points, pathDistance, baseDistance) {
    const legDistance = pathDistance / (points.length - 1);
    return _.map(
        points,
        (point, index) => _.extend(
            {
                dist: baseDistance + Math.round(legDistance * index)
            },
            point
        )
    );
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
                    pathElevations = mapToPointsWithElevationAndDistance(
                        results,
                        pathWithDistance.distance,
                        baseDistance
                    );
                }
                else {
                    logger.error("The getElevationAlongPath request for path:", pathWithDistance,
                            "failed with status:", status, "and results:", results);

                    pathElevations = mapToPointsWithDistance(
                        pathWithDistance.path,
                        pathWithDistance.distance,
                        baseDistance
                    );
                }

                const newElevations = [...elevations, ...pathElevations];
      
                logger.trace("Finished processing path:", pathWithDistance,
                        "; elevations:", newElevations);
        
                setTimeout(() => resolve(newElevations), 300);
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
 * @param {string} pointsHash - the hash of the given path points
 * @return {function} - an action
 */
module.exports.fetchAlongPath = function (pathWithDistanceLists, pointsHash) {
    logger.debug("Fetching along paths:", pathWithDistanceLists, "; hash:", pointsHash);

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
            dispatch(routePlannerAction.updateElevations(pointsHash, elevations));
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
 * @desc Map the given points to a list of points with elevation data, extracted from
 *     the given elevation query results.
 *     It is considered to be a 1-to-1 mapping between the points and the results.
 * @param {point[]} points - the points to map
 * @param {google.maps.ElevationResult[]} results - the elevation query results for the given points
 * @return {point[]} - a list of points with elevation coordinate
 */
const mapToPointsWithElevation = function (points, results) {
    const roundFactor = Math.pow(10, 5);

    return _.map(points, (point, index) => {
        const result = results[index];

        // compare the latitude and longitude of the current result and point;
        // they should match to the (and including) 5th decimal
        // (that's the rough equivalent of 1.1 meters).
        const resultLat = result.location.lat();
        const resultLng = result.location.lng();

        let elevation;
        if (Math.round(resultLat * roundFactor) !== Math.round(point.lat * roundFactor) ||
               Math.round(resultLng * roundFactor) !== Math.round(point.lng * roundFactor)) {
            logger.warn(
                    `Coordinates don't match for point at index ${
                        index
                    } and the corresponding result; point={${
                        point.lat
                    }, ${
                        point.lng
                    }, result={${
                        resultLat
                    }, ${
                        resultLng
                    }}`);
            elevation = null;
        }
        else {
            elevation = result.elevation.toFixed(2);
        }

        return _.extend({ ele: elevation }, point);
    });
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
                    const pathElevations = mapToPointsWithElevation(points, results);
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
 * @return {function} - an action
 */
module.exports.fetchForLocations = function (points) {
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
            dispatch(routePlannerAction.fetchForLocationsComplete(elevations));
        }).catch(function (reason) {
            logger.error(
                "Could not fetch elevations for locations:", points,
                "; reason:", reason
            );
            dispatchErrorNotifications(dispatch);
            dispatch(routePlannerAction.fetchForLocationsComplete(null));
        });
    };
};
