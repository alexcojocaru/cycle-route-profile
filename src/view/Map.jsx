/* global google:true*/
"use strict";

var React = require("react");
var _ = require("underscore");
var keyMirror = require("fbjs/lib/keyMirror");

var TravelMode = require("../constant/routePlannerConstant").TravelMode;
var TravelModePropValidator = require("../util/routeValidators").TravelModePropValidator;
var conversions = require("../util/mapsApiConversions");
var calculators = require("../util/routeCalculators");
var notifications = require("../util/routeNotifications");

var NotificationLevel = require("../constant/notificationConstant").Level;


/**
 * @desc This class is a huge hack. Some of it is React, but most of it is managed
 *   by the Google API.
 *   Because I don't want to re-render the map, all content is managed outside the React lifecycle.
 *   The element re-renders only when the google maps API is loaded.
 *   The route is recalculated only when the start point, finish point or travel mode change.
 *   The waypoint management is done by the Google API, and  a listener will keep the app store
 *   up to date.
 */
var Map = React.createClass({

    // this component only takes callbacks as props, it stores everything else internally
    propTypes: {
        isMapsApiLoaded: React.PropTypes.bool,
        travelMode: TravelModePropValidator,
        routeExists: React.PropTypes.bool,
        start: React.PropTypes.object,
        finish: React.PropTypes.object,
        waypoints: React.PropTypes.array,
        onRouteUpdate: React.PropTypes.func,
        onWaypointsUpdate: React.PropTypes.func,
        onNotification: React.PropTypes.func
    },

    // the following are instance variables which will be used internally;
    // define them here for the sake of reference
    map: null,
    mapDomClickListener: null,
    mapGoogleClickListener: null,
    directionsService: null,
    directionsRenderer: null,
    directionsListener: null,
    routeExists: false,
    start: null,
    finish: null,
    waypoints: [],

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
        const waypoint = calculators.findWaypointWithinBounds(this.map, this.waypoints, mouseEvent);

        if (waypoint) {
            const waypoints = _.without(this.waypoints, waypoint);
            this.props.onWaypointsUpdate(waypoints);
        }
    },

    /**
     * @desc Update the Google route when the route attributes (endpoints, waypoints, etc)
     *     change through the app and not through direct user interactions with the map/route.
     */
    _route: function () {
        if (this.props.isMapsApiLoaded && this.start && this.finish) {
            const self = this;

            const start = new google.maps.LatLng(self.start);
            const finish = new google.maps.LatLng(self.finish);
            const waypoints = conversions.convertSimpleWaypointList(self.waypoints);

            this.directionsService.route({
                origin: start,
                destination: finish,
                waypoints: waypoints,
                avoidTolls: true,
                avoidHighways: true,
                optimizeWaypoints: false,
                unitSystem: google.maps.UnitSystem.METRIC,
                travelMode: conversions.convertSimpleTravelMode(self.travelMode)
            }, function (result, status) {
                const isOK = status === google.maps.DirectionsStatus.OK;
                if (isOK) {
                    self.directionsRenderer.setDirections(result);
                }
                else {
                    self.props.onNotification(
                        NotificationLevel.ERROR,
                        "Route",
                        conversions.convertGoogleDirectionsStatus(status));
                }
            });
        }
        // TODO support for multiple renderers
    },
    
    /**
     * @desc Listener to route change events, triggered by direct user interactions
     *    with the map/route. It updates the route endpoints and/or waypoints as needed.
     */
    _onRouteChange: function () {
console.log("map: on route change");
        if (_.isEmpty(this.directionsRenderer.getDirections().routes)) {
            this.props.onRouteUpdate(null, null, [], 0);
            return;
        }

        var route = this.directionsRenderer.getDirections().routes[0];

        // put all waypoints on all legs into a single array
        const routePoints = calculators.mergeRouteLegs(route);

        // update the instance variables, to avoid the route re-render
        // when the route attributes are pushed back as props to this component
        const start = _.first(routePoints);
        const finish = _.last(routePoints);
        const waypoints = _.initial(_.rest(routePoints));
        const distance = calculators.totalDistance(route);

        notifications.routeUpdated(this.props.onNotification, this.waypoints, waypoints);

        // update the instance variables, to avoid the route re-render
        // when the route attributes are pushed back as props to this component
        this.start = start;
        this.finish = finish;
        this.waypoints = waypoints;
        this.props.onRouteUpdate(start, finish, waypoints, distance);

        // TODO support for multiple renderers
    },

/*

    SCENARIO: init
        rendererList = []
        routes = []

    SCENARIO: first route
        routes.push(route)
        rendererList.push(new DirectionsRenderer(
            start: route.start,
            finish: route.finish,
            waypoints: route.waypoints))


    route: {
        waypoints: []
    }

    _onMapDomClick:
        reducer.deleteWaypoint(waypoint)

    _route(routes: route[])
        var rendererMap = {}
        this.routes.foreach(function (route, index) {
            rendererMap.put(route.hash, rendererList.get(index);
        });

        var rendererList = [];

        for each (route : routes) {
            let renderer = rendererMap.get(route.hash);
            if (renderer = null) {
                // awesome; the route hasn't changed
                rendererList.add(renderer);
            }
            else {
                // hmmm... it's a new route; build a new renderer
                renderer = new Renderer(...)
            }
            rendererList.add(renderer);
        }

        // what's left in the rendererList are just renderers which are not actual any longer
        rendererMap.values.forEach(renderer -> renderer.setMap(null));

        this.rendererList = rendererList
        this.routes = routes

    _routeChanged:
        this.routes = ...;
        onRouteUpdate(routes);

    delete route
        rendererList.forEach( renderer -> renderer.setMap(null) )
        rendererList = []

    reducer.onRouteUpdate:
        normalizeRoutePoints:
            for each route:
                if route.end != nextRoute.start
                    update one of them; figure out which one changed by comparing with the previous state

        calculate distance

        const fullRoute = find the route with 25 points
        if (fullRoute) {
            rebuild the full route as 2 routes: 15 + 10 points
                newRoute1
                newRoute1.hash = hash(newRoute1.waypoints)
                newRoute2
                newRoute2.hash = hash(newRoute2.waypoints)
            index = state.routes.indexOf(fullRoute)
            state.routes.remove(fullRoute)
            state.routes.insert(newRoute1)
            state.routes.insert(newRoute2)
        }
        else {
            // I don't know which route updated
            state.routes = routes
            rebuildRouteHashes()
        }
        state.distance = distance

    reducer.deleteWaypoint:
        for (route: routes) {
            for (point: route.points) {
                if (firstRoute && waypoint == firstPoint || lastRoute && waypoint == lastPoint) {
                    // do nothing
                }
                else {
                    matchedRoute = route
                    matchedPoint = point
                }
            }
        }
        if (matchedRoute && matchedPoint) {
            const updateNextRoute = matchedRoute != lastRoute && nextRoute.firstPoint == matchedPoint;

            matchedRoute.remove(matchedPoint)

            if (updateNextRoute) {
                nextRoute.remove(firstPoint)
            }

            if (route.waypoints.length == 1 && nextRoute.waypoints.length == 1) {
                // we have two incomplete routes; delete the first
                // and move the start point on it to the next route as start point
                state.routes.delete(matchedRoute);
                nextRoute.insert(matchedRoute.firstPoint, 0);
                nextRoute.hash = hash(nextRoute.waypoints)
            }
            else if (route.waypoints.length == 1) {
                // just the current route is incomplete;
                // since I already deleted the start of the next route,
                // move the start of the current route as start on the next one
                state.routes.delete(matchedRoute);
                nextRoute.insert(matchedRoute.firstPoint, 0)
            }
            else if (nextRoute.waypoints.length == 1) {
                // just the next route is incomplete;
                // since I already deleted the finish of the current route,
                // move the finish of the next route as finish on the current one
                state.routes.delete(nextRoute);
                matchedRoute.add(nextRoute.lastPoint, 0)
            }
            else {
                // the current and next routes have enough waypoints to be valid;
                // since I already deleted the start of the next route,
                // I have room for adding one more point:
                // duplicate the finish on the current route as start on the next one
                if (updateNextRoute) {
                    nextRoute.insert(matchedRoute.lastPoint, 0)
                    nextRoute.hash = hash(nextRoute.waypoints)
                }
                matchedRoute.hash = hash(matchedRoute.waypoints)
            }
        }
        


                    SCENARIO: waypoints.length == 0 && add waypoint
                        nothing

                    SCENARIO: waypoints.length == 1 && removed waypoint
                        nothing

                    SCENARIO: waypoints.length % 22 == 0 && add waypoint
                        split waypoint lists
                        add new DirectionsRenderer

                    SCENARIO: waypoints.length % 22 == (1..21) && add waypoint
                        nothing

                    SCENARIO: waypoints.length % 22 == 1 && remove waypoint
                        compact waypoint lists
                        remove last DirectionsRenderer

                    SCENARIO: waypoints.length % 22 == (0, 2..21) && remove waypoint
                        nothing

*/

    // TODO REMOVE???
    _groupWaypoints: function (waypoints) {
        return _.chain(waypoints).groupBy(function (waypoint, index) {
            return Math.floor(index / 22);
        }).toArray().value();
    },

    /**
     * @desc Reset the map.
     */
    _resetMap: function () {
        // "disable" the existing directions display
        this.directionsRenderer.setMap(null);
        // and set up a new one
        this._initDirectionsRenderer();
        // TODO support for multiple renderers
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
        this.map = new google.maps.Map(mapElement, {
            center: { lat: 49.2956, lng: -123.1174 },
            mapTypeControl: true,
            mapTypeControlOptions: {
                mapTypeIds: [
                    google.maps.MapTypeId.ROADMAP,
                    google.maps.MapTypeId.SATELLITE,
                    google.maps.MapTypeId.TERRAIN
                ],
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                position: google.maps.ControlPosition.LEFT_TOP
            },
            zoomControl: true,
            zoom: 10,
            minZoom: 4,
            maxZoom: 19,
            scaleControl: true,
            scaleControlOptions: {
                style: google.maps.ScaleControlStyle.DEFAULT
            },
            streetViewControl: false
        });

        this.mapDomClickListener = google.maps.event.addDomListener(
            mapElement, "click", this._onMapDomClick
        );

        this.mapGoogleClickListener = this.map.addListener("click", this._onMapGoogleClick);
    },

    _initDirections: function () {
        this._initDirectionsService();
        this._initDirectionsRenderer();
    },

    _initDirectionsService: function () {
        this.directionsService = new google.maps.DirectionsService();
    },

    _initDirectionsRenderer: function () {
        // unregister the directions listener before adding a new one
        if (this.directionsListener) {
            this.directionsListener.remove();
        }

        var directionsOptions = {
            map: this.map,
            draggable: true,
            suppressInfoWindows: true
        };
        this.directionsRenderer = new google.maps.DirectionsRenderer(directionsOptions);

        this.directionsListener = this.directionsRenderer.addListener(
            "directions_changed",
            this._onRouteChange
        );
        
        this.props.onNotification(
            NotificationLevel.INFO,
            "Route",
            "To build a new route, click on the map to select the start and the finish points."
        );
        // TODO support for multiple renderers
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
        if (this.directionsListener) {
            this.directionsListener.remove();
        }
    },

    /**
     * @desc Update the instance variables one by one if the corresponding props have updated.
     * @param {object} nextProps - the next set of properties
     */
    componentWillReceiveProps: function (nextProps) {
        console.log("map props: travelMode:", this.travelMode,
                   ", start:", this.start,
                   ", finish:", this.finish,
                   ", waypoints:", this.waypoints);
        console.log("map nextProps:", nextProps);

        this.routeExists = nextProps.routeExists;

        let updateRoute = false;

        if (_.isEqual(this.travelMode, nextProps.travelMode) === false) {
            this.travelMode = nextProps.travelMode;
            updateRoute = true;
        }
        if (_.isEqual(this.start, nextProps.start) === false) {
            this.start = nextProps.start;
            updateRoute = true;
        }
        if (_.isEqual(this.finish, nextProps.finish) === false) {
            this.finish = nextProps.finish;
            updateRoute = true;
        }
        if (_.isEqual(this.waypoints, nextProps.waypoints) === false) {
            this.waypoints = nextProps.waypoints;
            updateRoute = true;
        }

        if (updateRoute) {
            console.log("redrawing the route");
            this._route();
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
