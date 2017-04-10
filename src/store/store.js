"use strict";

var createStore = require("redux").createStore;
var applyMiddleware = require("redux").applyMiddleware;
var combineReducers = require("redux").combineReducers;
var thunk = require("redux-thunk").default;

var routerReducer = require("react-router-redux").routerReducer;

var containerReducer = require("../reducer/containerReducer");
var apiKeyReducer = require("../reducer/apiKeyReducer");
var routePlannerReducer = require("../reducer/routePlannerReducer");
var elevationCalculatorReducer = require("../reducer/elevationCalculatorReducer");
var notificationReducer = require("../reducer/notificationReducer");


var reducer = combineReducers({
    container: containerReducer,
    apiKey: apiKeyReducer,
    route: routePlannerReducer,
    elevationCalculator: elevationCalculatorReducer,
    notification: notificationReducer,
    routing: routerReducer
});
var store = createStore(
    reducer,
    applyMiddleware(thunk)
);

module.exports = store;
