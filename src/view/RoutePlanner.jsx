"use strict";

var React = require("react");
var PanelGroup = require("react-panelgroup");

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

    _onHighlightActiveRoutePoint: function (point) {
        this.chart._onHighlightActiveRoutePoint(point);
    },

    componentWillReceiveProps: function (nextProps) {
        logger.debug("route planner nextProps.routeExists:", nextProps.routeExists);
    },

    render: function () {
        logger.debug("route planner render");

        return (
            <div id="route-planner">
                <PanelGroup direction="column"
                        spacing={2}
                        borderColor="grey"
                        panelWidths={[
                            {minSize:150, resize: "stretch"},
                            {size: 200, minSize:200, resize: "dynamic"}
                        ]}>
                    <Map ref={ map => { this.map = map; } }
                            {...this.props}
                            onHighlightActiveRoutePoint={this._onHighlightActiveRoutePoint} />
                    <ElevationChart ref={ chart => { this.chart = chart; } }
                            {...this.props} />
                </PanelGroup>
                <EndpointSelectionDialog {...this.props} />
                <Sidebar {...this.props} />
            </div>
        );
    }
});

module.exports = RoutePlanner;
