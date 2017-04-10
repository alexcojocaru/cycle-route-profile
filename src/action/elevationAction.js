/* global google:true*/
"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const _ = require("underscore");

const hash = require("../util/hash");
const FetchStatus = require("../constant/elevationConstant").FetchStatus;
const notificationAction = require("./notificationAction");
const NotificationLevel = require("../constant/notificationConstant").Level;
const routePlannerAction = require("./routePlannerAction");
const logger = require("../util/logger").logger("ElevationAction");


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
 * @desc Dispatch the notifications around fetching elevations for new points.
 * @param {function} dispatch - the dispatch function
 */
const dispatchProgressNotifications = function (dispatch) {
    dispatch(updateStatus(FetchStatus.RUNNING));

    // dispatch a sticky notification action
    dispatch(notificationAction.addNotification(
        NotificationLevel.INFO,
        "Fetching elevation coordinates",
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

    dispatch(notificationAction.addNotification(
        NotificationLevel.ERROR,
        "Fetching elevation coordinates",
        `The Google elevation API returned error while requesting elevation coordinates.
Error message: ${errorMessage}`));

    dispatch(updateStatus(FetchStatus.ERROR, errorMessage));
};

/**
 * @desc fetch the elevation coordinates for the given points.
 * @param {point[]} points - the points to fetch elevations for
 * @return {function} - an action
 */
module.exports.fetch = function (points) {
    logger.debug("Fetching elevations");
    return function (dispatch) {
        dispatchProgressNotifications(dispatch);

        /*
         * The Elevation APIs limitations are:
         * - 2,500 free requests per day
         * - 512 locations per request
         * - 50 requests per second
         */
        logger.trace("Sending get-elevations request");
        const elevator = new google.maps.ElevationService();
        elevator.getElevationAlongPath({
            path: _.map(points, point => new google.maps.LatLng(point.lat, point.lng)),
            samples: 512
        }, function (results, status) {
            logger.trace("Received get-elevations response; status:", status,
                         "; results:", results);

            let elevations = [];

            if (status === google.maps.ElevationStatus.OK) {
                dispatchSuccessNotifications(dispatch);

                elevations = _.map(results, result => {
                    return {
                        lat: result.location.lat(),
                        lng: result.location.lng(),
                        ele: Math.round(result.elevation * 100) / 100
                    };
                });
            }
            else {
                dispatchErrorNotifications(dispatch, status);
            }

            const pointsHash = hash.hashPoints(points);

            dispatch(routePlannerAction.updateElevations(pointsHash, elevations));
        });
    };
};
