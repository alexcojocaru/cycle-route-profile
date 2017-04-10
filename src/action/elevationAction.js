/* global google:true*/
"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const _ = require("underscore");

const FetchStatus = require("../constant/elevationConstant").FetchStatus;
const notificationAction = require("./notificationAction");
const NotificationLevel = require("../constant/notificationConstant").NotificationLevel;
const routePlannerAction = require("./routePlannerAction");


const Types = keyMirror({
    UPDATE_STATUS: null,
    UPDATE_PROGRESS: null
});
module.exports.Types = Types;

// I remember reading something about a 2000 char limit for the URL for Google APIs;
// this is a hardcoded limit, assumming the lat & long for each point are about 10 chars long.
const BATCH_SIZE = 90;

const updateStatus = function (status, message) {
    return {
        type: Types.UPDATE_STATUS,
        value: status,
        message: message
    };
};
module.exports.updateStatus = updateStatus;

const updateProgress = function (pointsFetched, pointsTotal) {
    return {
        type: Types.UPDATE_PROGRESS,
        pointsFetched: pointsFetched,
        pointsTotal: pointsTotal
    };
};
module.exports.updateProgress = updateProgress;

/**
 * @desc Dispatch the notifications around fetching elevations for new points.
 * @param {function} dispatch - the dispatch function
 * @param {number} fetchPointIndex - the index of the point being fetched currently
 * @param {number} totalPointCount - the total count of points fetched / to fetch
 */
const dispatchProgressNotifications = function (dispatch, fetchPointIndex, totalPointCount) {
    dispatch(updateStatus(FetchStatus.RUNNING));
    dispatch(updateProgress(fetchPointIndex, totalPointCount));

    // dispatch a sticky notification action
    dispatch(notificationAction.addNotification(
        NotificationLevel.INFO,
        "Fetching elevation coordinates",
        `The route cannot be modified while the elevation coordinates are being updated.
Progress: ${fetchPointIndex * 100 / totalPointCount}%`,
        "FETCH_ELEVATIONS"));
};

/**
 * @desc Dispatch the success notifications after all point elevations have been fetched.
 * @param {function} dispatch - the dispatch function
 * @param {number} totalPointCount - the total count of points fetched
 */
const dispatchSuccessNotifications = function (dispatch, totalPointCount) {
    dispatch(updateStatus(FetchStatus.SUCCESS));
    dispatch(updateProgress(totalPointCount, totalPointCount));

    // discard the sticky notification
    dispatch(notificationAction.deleteNotification("FETCH_ELEVATIONS"));
};

/**
 * @desc Dispatch the notifications around getting an elevation fetch error for a batch of points.
 * @param {function} dispatch - the dispatch function
 * @param {string} errorMessage - the error message
 * @param {number} start - the index of the first point in the batch
 * @param {number} end - the index of the last point in the batch
 */
const dispatchErrorNotifications = function (dispatch, errorMessage, start, end) {
    dispatch(notificationAction.addNotification(
        NotificationLevel.ERROR,
        "Fetching elevation coordinates",
        `The Google elevation API returned error while requesting
the elevation coordinates for points #${start} through #${end}.
Error message: ${errorMessage}`));
    dispatch(updateStatus(FetchStatus.ERROR, errorMessage));
};

const findFirstPointWithoutElevation = function (points) {
    return _.findIndex(points, point => _.has(point, "ele"));
};

/**
 * @desc Return the sublist between the two given bounds (inclusive, exclusive).
 * @param {point[]} points - the point list
 * @param {number} lowerBound - the index of the first point (inclusive) in the sublist
 * @param {number} upperBound - the index of the last point (exclusive) in the sublist
 * @return {point[]} - the sublist
 */
const pointSubList = function (points, lowerBound, upperBound) {
    return _.filter(points, (point, index) => {
        return index >= lowerBound && index < upperBound;
    });
};

/**
 * @desc Update the 'ele' attribute on the points in the given list with the elevation
 *    attribute on the corresponding point in the results list.
 * @param {point[]} points - the points to update
 * @param {number} lowerBound - the index of the points list in the global points list
 * @param {ElevationResult[]} results - the elevation query results
 */
const hydrateElevationCoordinate = function (points, lowerBound, results) {
    _.each(points, (point, index) => {
        const result = results[index];

        // compare the latitude and longitude of the current result and point;
        // they should match to the (and including) 5th decimal
        const resultLat = result.location.lat();
        const resultLng = result.location.lng();

        if (Math.round(resultLat * 10000) !== Math.round(point.lat() * 10000) ||
               Math.round(resultLng * 10000) !== Math.round(point.lng() * 10000)) {
            console.log(
                    "Coordinates don't match for point at index",
                    (lowerBound + index), "and the corresponding result:",
                    "point={", point.lat(), ",", point.lng(), "},",
                    "result={", resultLat, ",", resultLng, "}");
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
 * @param {string} routeHash - the hash of the route to fetch elevations for
 * @param {point[]} points - the list of points being updated with elevation coordinates;
 *    the update is done is place.
 */
const fetchElevations = function (dispatch, routeHash, points) {
    const lowerBound = findFirstPointWithoutElevation(points);

    if (lowerBound === -1) {
        dispatchSuccessNotifications(dispatch, points.length);
        dispatch(routePlannerAction.updateElevations(routeHash, points));
    }
    else {
        // create the subset of points to request the elevations for
        const upperBound = Math.min(lowerBound + BATCH_SIZE, points.length);
        const batch = pointSubList(points, lowerBound, upperBound);

        dispatchProgressNotifications(dispatch, lowerBound, points.length);

        // TODO: is it better to use elevator.getElevationAlongPath ?
        // https://developers.google.com/maps/documentation/javascript/elevation#ElevationResults
        const elevator = new google.maps.ElevationService();
        elevator.getElevationForLocations({
            locations: batch
        }, function (results, status) {
            if (status === google.maps.ElevationStatus.OK) {
                hydrateElevationCoordinate(
                    batch,
                    lowerBound,
                    results
                );
            }
            else {
                dispatchErrorNotifications(dispatch, status, lowerBound, upperBound);

                // mark the points in the current batch as being processed
                _.each(batch, point => point.ele = null);
            }

            // we're done processing this request; schedule the request for the next batch
            setTimeout(_.partial(fetchElevations, dispatch, routeHash, points), 1000);
        });
    }
};

/**
 * @desc fetch the elevation coordinates for the given route.
 * @param {route} route - the route to fetch elevations for
 * @return {function} - an action
 */
module.exports.fetch = function (route) {
    // since we're going to mutate the points and add the elevation coordinate to them,
    // clone the list
    const points = _.map(route.points, point => new google.maps.LatLng(point.lat, point.lng));

    return function (dispatch) {
        fetchElevations(dispatch, route.hash, points);
    };
};
