/* global google:true*/
"use strict";

var React = require("react");
var _ = require("underscore");

var TravelModePropValidator = require("../util/routeValidators").TravelModePropValidator;
var EndpointType = require("../constant/routePlannerConstant").EndpointType;
var conversions = require("../util/mapsApiConversions");
var calculators = require("../util/routeCalculators");
var notifications = require("../util/routeNotifications");
var builders = require("../util/mapBuilders");


/**
 * @desc This class is a huge hack. Some of it is React, but most of it is managed
 *   by the Google API.
 *   Because I don't want to re-render the map, all content is managed outside the React lifecycle.
 *   The element re-renders only when the google maps API is loaded.
 *   The route is recalculated only when the start point, finish point or travel mode change.
 *   The waypoint management is done by the Google API, and  a listener will keep the app store
 *   up to date.
 */
const Map = React.createClass({

    // this component only takes callbacks as props, it stores everything else internally
    propTypes: {
        isMapsApiLoaded: React.PropTypes.bool,
        travelMode: TravelModePropValidator,
        routeExists: React.PropTypes.bool,
        routes: React.PropTypes.array,
        onWaypointDelete: React.PropTypes.func,
        onRouteUpdate: React.PropTypes.func,
        onNotification: React.PropTypes.func,
        onOpenEndpointSelectionDialog: React.PropTypes.func
    },

    // the following are instance variables which will be used internally;
    // define them here for the sake of reference
    travelMode: null,
    map: null,
    mapDomClickListener: null,
    mapGoogleClickListener: null,
    directionsService: null,
    // special markers to help differentiate the global start/finish visually from the other points
    start: null,
    finish: null,
    // a map of route hashes to renderer and listener objects
    // eg: { 123: { renderer: r1, listener: l1 }, abc: { renderer: r2, listener: l2 } }
    routesDirections: {},
    routeExists: false,
    routes: [],
    controlsDisabled: false,

    /**
     * @desc When the user clicks on the map, if the start and the finish point are not set,
     *     show the endpoint selection dialog. If the start and finish are set, there are
     *     other actions I need to attend to (eg. delete waypoint).
     * @param {google.maps.MouseEvent} mouseEvent - the mouse event
     */
    _onMapGoogleClick: function (mouseEvent) {
        if (this.routeExists) {
            return;
        }

        mouseEvent.stop();

        const geoLocation = conversions.convertGoogleCoordinateToSimple(mouseEvent.latLng);
        const screenLocation = conversions.convertGoogleCoordinateToAbsolute(
            this.map, mouseEvent.latLng);

        this.props.onOpenEndpointSelectionDialog(geoLocation, screenLocation);
    },

    /**
     * @desc When the user clicks on the map, check if there's a waypoint under the cursor
     *     and, if so, remove it and redraw the route.
     * @param {MouseEvent} mouseEvent - the Google mouse event
     */
    _onMapDomClick: function (mouseEvent) {
        const waypoint = calculators.findWaypointWithinBounds(this.map, this.routes, mouseEvent);

        if (waypoint) {
            this.props.onWaypointDelete(this.routes, waypoint);
        }
    },

    /**
     * @desc Update the given endpoint marker to coincide
     *    with the point on the route found by the finder function.
     * @param {function} finder - the finder function to be applied on the route list
     *    and on the point list
     * @param {google.maps.Marker} endpoint - the marker to update
     */
    _updateEndpoint: function (finder, endpoint) {
        const route = finder(this.routes);
        const point = route && finder(route.points);
        if (point) {
            endpoint.setPosition(conversions.convertSimpleCoordinateToGoogle(point));
        }
        endpoint.setVisible(Boolean(point));
    },

    /**
     * @desc Update the Google route when the route attributes (endpoints, waypoints, etc)
     *     change through the app and not through direct user interactions with the map/route.
     * @param {boolean} isNewRoute - whether this is the first route to render
     */
    _route: function (isNewRoute) {
        console.log("rendering routes");
        if (this.props.isMapsApiLoaded) {
            const self = this;
            const newRouteHashes = _.pluck(this.routes, "hash");
            const oldRouteHashes = _.keys(this.routesDirections);

            const deletedRouteHashes = _.without(oldRouteHashes, ...newRouteHashes);
            _.each(deletedRouteHashes, function (hash) {
                self._unregisterRoute(hash);
            });

            const netNewRouteHashes = _.without(newRouteHashes, ...oldRouteHashes);
            _.each(netNewRouteHashes, function (hash) {
                self._registerRoute(hash, isNewRoute);
            });

            // update the start marker only if the old first route was removed/replaced
            if (_.contains(deletedRouteHashes, _.first(oldRouteHashes))) {
                this._updateEndpoint(_.first, this.start);
            }
            // update the finish marker only if the old last route was removed/replaced
            if (_.contains(deletedRouteHashes, _.last(oldRouteHashes))) {
                this._updateEndpoint(_.last, this.finish);
            }
        }
    },

    /**
     * @desc Replace the route with the given hash in the routes list with the supplied new route.
     *    The routesDirections are updated accordingly.
     *    This is just a hack, to avoid the route re-render when the route attributes
     *    are pushed back as props to this component.
     * @param {string} oldRouteHash - the hash of the route to replace
     * @param {object} newRoute - the replacement
     */
    _replaceRoute: function (oldRouteHash, newRoute) {
        const newRoutes = _.map(this.routes, function (r) {
            return r.hash === oldRouteHash ? newRoute : r;
        });
        this.routes = newRoutes;

        // since I cannot update the listener, I am going to remove the existing one
        // and attach a new one with the correct callback
        const routeDirections = this.routesDirections[oldRouteHash];
        routeDirections.listener.remove();
        routeDirections.listener = routeDirections.renderer.addListener(
            "directions_changed",
            _.partial(this._onRouteChange, newRoute.hash)
        );

        // re-add the routeDirections with the correct hash key
        const newRoutesDirections = _.omit(this.routesDirections, oldRouteHash);
        newRoutesDirections[newRoute.hash] = routeDirections;
        this.routesDirections = newRoutesDirections;

        // update the global start marker only if the first route changed
        if (_.first(this.routes).hash === newRoute.hash) {
            this._updateEndpoint(_.first, this.start);
        }
        // update the global finish marker only if the last route changed
        if (_.last(this.routes).hash === newRoute.hash) {
            this._updateEndpoint(_.last, this.finish);
        }
    },
    
    /**
     * @desc Listener to route change events, triggered by direct user interactions
     *    with the map/route. It updates the route endpoints and/or waypoints as needed.
     * @param {string} routeHash - the hash of the changing route
     */
    _onRouteChange: function (routeHash) {
        console.log("map: on route change:", routeHash);
        console.log("map: routesDirections:", this.routesDirections);

        const newGoogleRoute = this.routesDirections[routeHash].renderer.getDirections().routes[0];
        const newRoute = conversions.convertGoogleRoute(newGoogleRoute);

        // save this; I am going to need it later
        const oldRoutes = this.routes;

        this._replaceRoute(routeHash, newRoute);

        this.props.onRouteUpdate(routeHash, newRoute, this.routes);

        if (oldRoutes.length === 1 && oldRoutes[0].points.length === 2 &&
                this.routes.length === 1 && this.routes[0].points.length === 3) {
            notifications.firstWaypoint(this.props.onNotification);
        }
    },

    /**
     * @desc Initialize the map object, only if the google map related code has loaded
     */
    _init: function () {
        // double check; just one condition would be enough though
        if (this.props.isMapsApiLoaded === true && typeof (google) !== "undefined") {
            this._initMap();
            this._initDirections();
        }
    },

    _initMap: function () {
        const mapElement = document.getElementById("map");
        this.map = builders.newMap(mapElement);
        this.mapDomClickListener = google.maps.event.addDomListener(
            mapElement, "click", this._onMapDomClick
        );
        this.mapGoogleClickListener = this.map.addListener("click", this._onMapGoogleClick);
    },

    _initDirections: function () {
        this.directionsService = new google.maps.DirectionsService();

        this.start = builders.newMarker(EndpointType.START, this.map);
        this.finish = builders.newMarker(EndpointType.FINISH, this.map);
    },

    _buildRouteDefinition: function (routeHash) {
        const route = _.find(this.routes, function (r) {
            return r.hash === routeHash;
        });

        return builders.newDirectionsRequest(route, this.travelMode);
    },

    _registerRoute: function (routeHash, isNewRoute) {
        console.log("registering route", routeHash, "; is new:", isNewRoute);
        const self = this;

        const renderer = new google.maps.DirectionsRenderer(
            builders.newDirectionsRendererOptions(this.map, !isNewRoute, !this.controlsDisabled)
        );

        this.directionsService.route(
            self._buildRouteDefinition(routeHash),
            function (result, status) {
                const isOK = status === google.maps.DirectionsStatus.OK;
                if (isOK) {
                    renderer.setDirections(result);
                }
                else {
                    console.log(`ERROR: the directions rendering failed with: ${status}`);
                    notifications.routeError(self.props.onNotification, status);
                }
            }
        );

        const listener = renderer.addListener(
            "directions_changed",
            _.partial(this._onRouteChange, routeHash)
        );

        this.routesDirections[routeHash] = {
            renderer: renderer,
            listener: listener
        };
    },

    _unregisterRoute: function (routeHash) {
        console.log("unregistering route", routeHash);

        const routeDirections = this.routesDirections[routeHash];
        routeDirections.listener.remove();
        routeDirections.renderer.setMap(null);

        // remove the renderer and the listener for the route to unregister
        this.routesDirections = _.omit(this.routesDirections, routeHash);
    },

    componentDidMount: function () {
        this._init();
    },

    componentWillUnmount: function () {
        // unregister all listeners
        if (this.mapDomClickListener) {
            this.mapDomClickListener.remove();
        }
        if (this.mapGoogleClickListener) {
            this.mapGoogleClickListener.remove();
        }
        _.each(this.routesDirections, function (routeDirections) {
            routeDirections.listener.remove();
        });
    },

    /**
     * @desc Update the instance variables one by one if the corresponding props have updated.
     * @param {object} nextProps - the next set of properties
     */
    componentWillReceiveProps: function (nextProps) {
        console.log("map props:",
                ", travelMode:", this.travelMode,
                ", routes:", this.routes,
                ", controlsDisabled:", this.controlsDisabled);
        console.log("map nextProps:",
                ", travelMode:", nextProps.travelMode,
                ", routes:", nextProps.routes,
                ", controlsDisabled:", nextProps.controlsDisabled);

        const self = this;

        const isNewRoute = this.routeExists === false && nextProps.routeExists;
        const isRouteRemoved = this.routes.length > 0 && nextProps.routes.length === 0;

        this.routeExists = nextProps.routeExists;

        let updateRoute = false;

        if (_.isEqual(this.travelMode, nextProps.travelMode) === false) {
            this.travelMode = nextProps.travelMode;
            updateRoute = true;
        }

        // for each new route, check if there is not a matching old route;
        // the length comparison avoids the negative result for empty new route list
        const routesChanged = nextProps.routes.length !== this.routes.length ||
            _.some(nextProps.routes, function (newRoute) {
                return false === _.some(self.routes, function (route) {
                    return route.hash === newRoute.hash;
                });
            });
        if (routesChanged) {
            this.routes = nextProps.routes;
            updateRoute = true;
        }
        
        if (updateRoute) {
            console.log("RE-RENDER THE ROUTES");

            this._route(isNewRoute);

            if (isRouteRemoved) {
                notifications.mapReady(this.props.onNotification);
            }
        }

        // disable/enable the routes if the flag changed
        if (this.controlsDisabled !== nextProps.controlsDisabled) {
            console.log("DISABLE/ENABLE the routes");
            this.controlsDisabled = nextProps.controlsDisabled;
            _.each(this.routesDirections, function (routeDirections) {
                routeDirections.renderer.setOptions({
                    draggable: !self.controlsDisabled
                });
            });
        }
    },

    /**
     * @desc Update only after the map script loads.
     * @param {object} nextProps - the next set of properties
     * @return {boolean} - whether the component should be updated by React
     */
    shouldComponentUpdate: function (nextProps) {
        return this.props.isMapsApiLoaded !== nextProps.isMapsApiLoaded;
    },

    componentDidUpdate: function () {
        this._init();
        notifications.mapReady(this.props.onNotification);
    },

    render: function () {
        return (
            <div id="map-container">
                <div id="map" />
            </div>
        );
    }
});

module.exports = Map;
