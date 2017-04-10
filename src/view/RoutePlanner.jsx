"use strict";

var React = require("react");

const logger = require("../util/logger").logger("RoutePlanner");
var Map = require("./Map.jsx");
var ElevationChart = require("./ElevationChart.jsx");
var EndpointSelectionDialog = require("./EndpointSelectionDialog.jsx");
var Sidebar = require("./Sidebar.jsx");

var RoutePlanner = React.createClass({
    propTypes: {
        /*
         * due to how the props are passed through the router,
         * on class initialize the props are all null,
         * therefore I cannot mark the required one as such.
         */
        routeExists: React.PropTypes.bool,
        onRoutesUpdate: React.PropTypes.func
    },

    componentWillReceiveProps: function (nextProps) {
        logger.debug("route planner nextProps.routeExists:", nextProps.routeExists);
    },

    render: function () {
        logger.debug("route planner render");

        return (
            <div id="route-planner">
                <Map ref={ map => { this.map = map; } } {...this.props} />
                <ElevationChart {...this.props} />
                <EndpointSelectionDialog {...this.props} />
                <Sidebar {...this.props} />
            </div>
        );
    }
});

module.exports = RoutePlanner;
