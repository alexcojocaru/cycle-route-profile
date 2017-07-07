"use strict";

var React = require("react");
var PanelGroup = require("react-panelgroup");
var _ = require("underscore");

const logger = require("../util/logger").logger("RoutePlanner");
var Map = require("./Map.jsx");
var ElevationChart = require("./ElevationChart.jsx");
var EndpointSelectionDialog = require("./EndpointSelectionDialog.jsx");
var Sidebar = require("./Sidebar.jsx");
const parsers = require("../util/routeParsers");

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

    _onExportGpx: function () {
        this.props.onExportGpx(
            parsers.concatenatePointLists(
                this.map._getCompletePointsLists()
            )
        );
    },

    _onHighlightActiveRoutePoint: function (point) {
        this.chart._onHighlightActivePoint(point);
    },

    _onHighlightActiveChartPoint: function (point) {
        this.map._onHighlightActivePoint(point);
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
                            {...this.props}
                            onHighlightActiveChartPoint={this._onHighlightActiveChartPoint} />
                </PanelGroup>
                <EndpointSelectionDialog {...this.props} />
                <Sidebar { ..._.extend(this.props, { onExportGpx: this._onExportGpx }) } />
            </div>
        );
    }
});

module.exports = RoutePlanner;
