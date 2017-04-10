/* global google:true*/
"use strict";

var _ = require("underscore");

var ActionTypes = require("../action/routePlannerAction.js").Types;
var TravelMode = require("../constant/routePlannerConstant").TravelMode;
var EndpointType = require("../constant/routePlannerConstant").EndpointType;

var initialState = {
    travelMode: TravelMode.ROAD,
    routeExists: false,
    start: null,
    finish: null,
    waypoints: [],
    distance: 0,
    // the (lat, lng) geo location of the mouse position when the endpoint selection dialog opened
    endpoint: null,
    // the (x, y) location of the endpoint selection dialog, inferred from the currentEndpointLocation
    endpointSelectionDialogLocation: {x: 0, y: 0},
    endpointSelectionDialogVisible: false
};

var routePlannerReducer = function (state, action) {
console.log("current reducer state:", state); // eslint-disable-line indent
console.log("action:", action); // eslint-disable-line indent
    var nextState = _.clone(state || initialState);

    switch (action.type) {
        case ActionTypes.UPDATE_ENDPOINT:
            const point = typeof(action.point) !== "undefined" ? point : state.endpoint;
            switch (action.endpointType) {
                case EndpointType.START:
                    nextState.start = point;
                    break;
                case EndpointType.FINISH:
                    nextState.finish = point;
                    break;
                default:
                    console.log("Unknown endpoint type to update:", action.endpointType);
            }
            nextState.endpoint = null;
            break;
        case ActionTypes.UPDATE_WAYPOINTS:
            nextState.waypoints = action.waypoints;
            break;
        case ActionTypes.UPDATE_ROUTE:
            nextState.start = action.start;
            nextState.finish = action.finish;
            nextState.waypoints = action.waypoints;
            nextState.distance = action.distance;
            break;
        case ActionTypes.UPDATE_TRAVEL_MODE:
            nextState.travelMode = action.mode;
            break;
        case ActionTypes.OPEN_ENDPOINT_SELECTION_DIALOG:
            nextState.endpoint = action.geoLocation;
            nextState.endpointSelectionDialogLocation = action.screenLocation;
            nextState.endpointSelectionDialogVisible = true;
            break;
        case ActionTypes.CLOSE_ENDPOINT_SELECTION_DIALOG:
            nextState.endpointSelectionDialogVisible = false;
            break;
        default:
    }
    nextState.routeExists = Boolean(nextState.start && nextState.finish);
console.log("next reducer state:", nextState); // eslint-disable-line indent
    return nextState;
};

module.exports = routePlannerReducer;
