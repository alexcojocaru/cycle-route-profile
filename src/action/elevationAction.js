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
const routeBuilders = require("../util/routeBuilders");

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

const buildFetchAlongPathPromise = function (elevationSvc, pathWithDistance) {
    return function (elevations) {
        return new Promise(function (resolve, reject) {
            logger.trace("Sending getElevationAlongPath request for path:", pathWithDistance);

            elevationSvc.getElevationAlongPath({
                path: _.map(
                    pathWithDistance.path,
                    point => new google.maps.LatLng(point.lat, point.lng)
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
                    const legDistance = pathWithDistance.distance / (results.length - 1);
                    pathElevations = _.map(results, (result, index) => {
                        return {
                            lat: result.location.lat(),
                            lng: result.location.lng(),
                            ele: Math.round(result.elevation * 100) / 100,
                            dist: baseDistance + Math.round(legDistance * index)
                        };
                    });
                }
                else {
                    logger.error("The getElevationAlongPath request for path:", pathWithDistance,
                            "failed with status:", status, "and results:", results);

                    // I am just going to assume the points on the path are equidistant
                    const legDistance = pathWithDistance.distance /
                            (pathWithDistance.path.length - 1);
                    pathElevations = _.map(
                        pathWithDistance.path,
                        (point, index) => _.extend(
                            {
                                ele: 0,
                                dist: baseDistance + Math.round(legDistance * index)
                            },
                            point
                        )
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
 * @desc Return the a list of Google points, corresponding to the requested sublist.
 * @param {point[]} points - the point list
 * @param {number} lowerBound - the index of the first point (inclusive) in the sublist
 * @param {number} upperBound - the index of the last point (exclusive) in the sublist
 * @return {point[]} - the sublist
 */
const googlePointSubList = function (points, lowerBound, upperBound) {
    return _.map(
        _.filter(points, (point, index) => {
            return index >= lowerBound && index < upperBound;
        }),
        point => conversions.convertSimpleCoordinateToGoogle(point)
    );
};

/**
 * @desc Update the 'ele' attribute on the points in the given list with the elevation
 *    attribute on the corresponding point in the results list.
 * @param {point[]} elevations - the points to update
 * @param {number} lowerBound - the index of the results list in the points list
 * @param {ElevationResult[]} results - the elevation query results
 */
const hydrateElevationCoordinate = function (points, lowerBound, results) {
    _.each(results, (result, index) => {
        const point = points[lowerBound + index];

        // compare the latitude and longitude of the current result and point;
        // they should match to the (and including) 5th decimal
        const resultLat = result.location.lat();
        const resultLng = result.location.lng();

        if (Math.round(resultLat * 10000) !== Math.round(point.lat * 10000) ||
               Math.round(resultLng * 10000) !== Math.round(point.lng * 10000)) {
            logger.warn(
                    `Coordinates don't match for point at index ${
                        lowerBound + index
                    } and the corresponding result; point={${
                        point.lat
                    }, ${
                        point.lng
                    }, result={${
                        resultLat
                    }, ${
                        resultLng
                    }}`);
            point.ele = null;
        }
        else {
            point.ele = result.elevation.toFixed(2);
        }
    });
};

/**
 * @desc Fetch the elevation coordinates for the next batch of points.
 *    The Elevation APIs limitations are:
 *    - 2,500 free requests per day
 *    - 512 locations per request
 *    - 50 requests per second
 * @param {function} dispatch - the dispatch function
 * @param {point[]} elevations - the list of points being updated with elevation coordinates;
 *    the update is done is place.
 * @param {number} lowerBound - the lower bound of the batch to be updated
 * @param {function} resolve - the promise resolve function
 * @param {function} reject - the promise reject function
 */
const fetchForLocationsSublist = function (dispatch, elevations, lowerBound, resolve, reject) {
    logger.debug("Fetching elevations for locations sublist at index:", lowerBound);

    if (lowerBound === elevations.length) {
        logger.debug("Finished fetching elevations");

        // we have exhausted the points list
        resolve(elevations);
        return;
    }

    const batchSize = 100;
    const elevator = new google.maps.ElevationService();

    dispatchFetchForLocationsProgressNotifications(dispatch, lowerBound, elevations.length);

    const upperBound = Math.min(lowerBound + batchSize, elevations.length);

    // this is a list of Google LatLng points
    const batch = googlePointSubList(elevations, lowerBound, upperBound);

    logger.debug(`Fetching elevations for batch ${lowerBound}..${upperBound}`);

    elevator.getElevationForLocations({ locations: batch }, function (results, status) {
        logger.debug(`Received status '${status}' when fetching elevations for batch`);

        if (status === google.maps.ElevationStatus.OK) {
            hydrateElevationCoordinate(elevations, lowerBound, results);

            setTimeout(
                _.partial(
                    fetchForLocationsSublist,
                    dispatch,
                    elevations,
                    upperBound,
                    resolve,
                    reject
                ),
                1000
            );
        }
        else {
            reject(status);
        }
    });
};

/**
 * @desc Fetch the elevation coordinates for the given points.
 * @param {function} dispatch - the dispatch function
 * @param {point[]} points - the points
 * @return {function} - an action
 */
module.exports.fetchForLocations = function (dispatch, points) {
    const elevations = _.map(points, point => routeBuilders.clonePoint(point));
    logger.debug("Fetching elevations for locations; size:", elevations.length);

    return function (dispatch) {
        new Promise(
            _.partial(fetchForLocationsSublist, dispatch, elevations, 0)
        ).then(function (elevations) {
            logger.debug("Successfully fetched elevations for locations");
            dispatchSuccessNotifications(dispatch);
            dispatch(routePlannerAction.fetchForLocationsComplete(elevations));
        }).catch(function (status) {
            logger.debug("Error while fetching elevations for locations");
            dispatchErrorNotifications(dispatch, status);
            dispatch(routePlannerAction.fetchForLocationsComplete(null));
        });
    };
};
