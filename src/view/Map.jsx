/* global google:true*/
"use strict";

const React = require("react");
const _ = require("underscore");

const logger = require("../util/logger").map;
const TravelModePropValidator = require("../util/routeValidators").TravelModePropValidator;
const EndpointType = require("../constant/routePlannerConstant").EndpointType;
const conversions = require("../util/mapsApiConversions");
const calculators = require("../util/routeCalculators");
const parsers = require("../util/routeParsers");
const notifications = require("../util/routeNotifications");
const builders = require("../util/mapBuilders");
const routeBuilders = require("../util/routeBuilders");


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
        onFetchElevations: React.PropTypes.func,
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
            this.props.onWaypointDelete(waypoint);
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

    _registerRoute: function (routeHash, isNewRoute) {
        logger.debug("registering route", routeHash, "; is new:", isNewRoute);
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
                    logger.error(`the directions rendering failed with: ${status}`);
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
        logger.debug("unregistering route", routeHash);

        const routeDirections = this.routesDirections[routeHash];
        routeDirections.listener.remove();
        routeDirections.renderer.setMap(null);

        // remove the renderer and the listener for the route to unregister
        this.routesDirections = _.omit(this.routesDirections, routeHash);
    },

    /**
     * @desc Update the Google route when the route attributes (endpoints, waypoints, etc)
     *     change through the app and not through direct user interactions with the map/route.
     * @param {boolean} isNewRoute - whether this is the first route to render
     * @param {boolean} forceRegister - force a re-registration of all routes
     *    (eg. when the routes haven't changed, but the travel mode has)
     */
    _route: function (isNewRoute, forceRegister) {
        logger.debug("rendering routes; isNewRoute:", isNewRoute,
                     ", forceRegister:", forceRegister);

        if (this.props.isMapsApiLoaded) {
            const self = this;
            const newRouteHashes = _.pluck(this.routes, "hash");
            const oldRouteHashes = _.keys(this.routesDirections);

            const deletedRouteHashes = forceRegister
                    ? oldRouteHashes
                    : _.without(oldRouteHashes, ...newRouteHashes);
            logger.debug("deleted routes: ", _.reduce(
                deletedRouteHashes,
                (memo, hash) => memo + ", " + hash,
                    ""
            ));
            _.each(deletedRouteHashes, function (hash) {
                self._unregisterRoute(hash);
            });

            const netNewRouteHashes = forceRegister
                    ? newRouteHashes
                    : _.without(newRouteHashes, ...oldRouteHashes);
            logger.debug("net new routes: ", _.reduce(
                netNewRouteHashes,
                (memo, hash) => memo + ", " + hash,
                    ""
            ));
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
     * @desc Listener to route change events, triggered by direct user interactions
     *    with the map/route. It updates the route endpoints and/or waypoints as needed.
     * @param {string} routeHash - the hash of the changing route
     */
    _onRouteChange: function (routeHash) {
        logger.debug("map: on route change:", routeHash);
        logger.debug("map: routesDirections:", this.routesDirections);

        const oldRoute = _.find(this.routes, route => route.hash === routeHash);

        const newGoogleRoute = this.routesDirections[routeHash].renderer.getDirections().routes[0];
        const newRoute = conversions.convertGoogleRoute(newGoogleRoute);

        let fetchElevations = false;

        if (routeHash !== newRoute.hash) {
            logger.debug("route hash changed; old:", routeHash, "; new:", newRoute.hash);

            // update the local route list, to avoid a renderer update (and another event cycle)
            // when the new route list is sent to this component as prop
            this.routes = _.map(this.routes, route => route.hash === routeHash ? newRoute : route);

            this._unregisterRoute(routeHash);
            this._registerRoute(newRoute.hash, false);

            // update the start marker only if it is on this route
            if (_.first(this.routes) === newRoute) {
                this._updateEndpoint(_.first, this.start);
            }
            // update the finish marker only if it is on this route
            if (_.last(this.routes) === newRoute) {
                this._updateEndpoint(_.last, this.finish);
            }

            this.props.onRouteUpdate(routeHash, newRoute);
        }
        else if (oldRoute.distance !== newRoute.distance) {
            logger.debug("route distance changed; old:", oldRoute.distance,
                         "; new:", newRoute.distance);

            // update the local route list, to avoid a renderer update (and another event cycle)
            // when the new route list is sent to this component as prop
            this.routes = _.map(this.routes, route => route.hash === routeHash ? newRoute : route);

            this.props.onRouteUpdate(routeHash, newRoute);

            // this is the last update on this route within this cycle
            fetchElevations = true;
        }
        else {
            // this is the last update on this route within this cycle
            fetchElevations = true;
        }

        if (fetchElevations) {
            logger.debug("Route", routeHash, "has settled down; fetching elevation for route:", routeHash);
            this.props.onFetchElevations(routeHash, newRoute.points);
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
        const route = _.find(this.routes, r => r.hash === routeHash);
        return builders.newDirectionsRequest(route, this.travelMode);
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
        logger.debug("map props:",
                ", travelMode:", this.travelMode,
                ", routes:", this.routes,
                ", controlsDisabled:", this.controlsDisabled);
        logger.debug("map nextProps:",
                ", travelMode:", nextProps.travelMode,
                ", routes:", nextProps.routes,
                ", controlsDisabled:", nextProps.controlsDisabled);

        const self = this;

        const isNewRoute = this.routeExists === false && nextProps.routeExists;
        const isRouteRemoved = this.routes.length > 0 && nextProps.routes.length === 0;
        const isTravelModeChanged = _.isEqual(this.travelMode, nextProps.travelMode) === false;

        this.routeExists = nextProps.routeExists;

        let updateRoute = false;

        if (isTravelModeChanged) {
            logger.debug("travel mode has changed");
            this.travelMode = nextProps.travelMode;
            updateRoute = true;
        }

        if (parsers.areRoutesSame(this.routes, nextProps.routes) === false) {
            logger.debug("routes have changed");
            this.routes = nextProps.routes;
            updateRoute = true;
        }
        
        if (updateRoute) {
            this._route(isNewRoute, isTravelModeChanged);

            if (isRouteRemoved) {
                notifications.mapReady(this.props.onNotification);
            }
        }

        // disable/enable the routes if the flag changed
        if (this.controlsDisabled !== nextProps.controlsDisabled) {
            logger.debug("DISABLE/ENABLE the routes:", nextProps.controlsDisabled);
            this.controlsDisabled = nextProps.controlsDisabled;
            _.each(this.routesDirections, function (routeDirections) {
                // TODO
                /*
                routeDirections.renderer.setOptions({
                    draggable: !self.controlsDisabled
                });
                */
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
