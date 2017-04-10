"use strict";

var React = require("react");
var _ = require("underscore");
var Box = require("reflexbox").Box;
var Flex = require("reflexbox").Flex;
var RaisedButton = require("material-ui/RaisedButton").default;
var MenuItem = require("material-ui/MenuItem").default;
var SelectField = require("material-ui/SelectField").default;

var RoutePlannerTooltip = require("../tooltip/RoutePlannerTooltip.jsx");
var TravelMode = require("../constant/routePlannerConstant").TravelMode;
var TravelModeLabel = require("../constant/routePlannerConstant").TravelModeLabel;
var TravelModePropValidator = require("../util/routeValidators").TravelModePropValidator;
var formatters = require("../util/routeFormatters");

var Map = require("./Map.jsx");
var EndpointSelectionDialog = require("./EndpointSelectionDialog.jsx");

var RoutePlanner = React.createClass({
    propTypes: {
        /*
         * due to how the props are passed through the router,
         * on class initialize the props are all null,
         * therefore I cannot mark the required one as such.
         */
        travelMode: TravelModePropValidator,
        routeExists: React.PropTypes.bool,
        distance: React.PropTypes.number,
        onTravelModeUpdate: React.PropTypes.func,
        onRoutesUpdate: React.PropTypes.func
    },

    _onDeleteRoutes: function () {
        if (this.props.routeExists) {
            this.props.onRoutesDelete();
        }
    },

    _onExportGpx: function () {
        if (this.props.routeExists) {
            this.map._exportGpx();
        }
    },

    _onTravelModeUpdate: function (event, key, payload) {
        this.props.onTravelModeUpdate(payload);
    },

    _buildDistanceComponent: function () {
        return this.props.distance > 0
            ? (
                <Box px={2}>
                    <span className="label">Distance:</span>
                    {formatters.formatDistance(this.props.distance)}
                </Box>
            )
            : null;
    },

    componentWillReceiveProps: function (nextProps) {
        console.log("route planner nextProps:", nextProps.travelMode); // eslint-disable-line indent
    },

    render: function () {
console.log("route planner render"); // eslint-disable-line indent
        return (
            <div id="route-planner">
                <Flex px={2} align="center">
                    <Box>
                        <span className="label">Travel mode</span>
                    </Box>
                    <Box>
                        <SelectField
                                value={this.props.travelMode}
                                onChange={this._onTravelModeUpdate}>
                            {
                                _.map(TravelMode, function (name) {
                                    return (
                                        <MenuItem
                                                value={name}
                                                key={name}
                                                primaryText={TravelModeLabel[name]}
                                        />
                                    );
                                })
                            }
                        </SelectField>
                    </Box>
                    { this._buildDistanceComponent() }
                    <Box px={2}>
                        <RaisedButton
                                label="Delete route"
                                onClick={this._onDeleteRoutes}
                                title="Delete the current route"
                                disabled={!this.props.routeExists}
                        />
                    </Box>
                    <Box px={2} auto={true}>
                        <RaisedButton
                                label="Export GPX"
                                onClick={this._onExportGpx}
                                title="Export the current route as GPX"
                                disabled={!this.props.routeExists}
                        />
                    </Box>
                    <Box pl={3}>
                        <span className="label" style={{ fontWeight: "bold" }}>Help</span>
                    </Box>
                    <Box>
                        <RoutePlannerTooltip />
                    </Box>
                </Flex>
                <Map ref={ map => { this.map = map; } } {...this.props} />
                <EndpointSelectionDialog {...this.props} />
            </div>
        );
    }
});

module.exports = RoutePlanner;
