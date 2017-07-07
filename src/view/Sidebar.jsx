"use strict";

var React = require("react");
var _ = require("underscore");
var classnames = require("classnames");

var Box = require("reflexbox").Box;
var Flex = require("reflexbox").Flex;
var RaisedButton = require("material-ui/RaisedButton").default;
var MenuItem = require("material-ui/MenuItem").default;
var SelectField = require("material-ui/SelectField").default;
var AppBar = require("material-ui/AppBar").default;

var SidebarButton = require("./SidebarButton.jsx");
var RoutePlannerTooltip = require("../tooltip/RoutePlannerTooltip.jsx");
var AboutTooltip = require("../tooltip/AboutTooltip.jsx");
var TravelMode = require("../constant/routePlannerConstant").TravelMode;
var TravelModeLabel = require("../constant/routePlannerConstant").TravelModeLabel;
var TravelModePropValidator = require("../util/routeValidators").TravelModePropValidator;
var formatters = require("../util/routeFormatters");
var ViewType = require("../constant/containerConstant").ViewType;

var Sidebar = React.createClass({
    propTypes: {
        controlsOpened: React.PropTypes.bool,
        travelMode: TravelModePropValidator,
        routeExists: React.PropTypes.bool,
        distance: React.PropTypes.number,
        elevationGain: React.PropTypes.number,
        elevationLoss: React.PropTypes.number,
        onToggleControls: React.PropTypes.func,
        onTravelModeUpdate: React.PropTypes.func,
        onSidebarPlotAccurateElevationChart: React.PropTypes.func,
        onRoutesDelete: React.PropTypes.func,
        onSidebarExportGpx: React.PropTypes.func,
        onSidebarExportRouteSheet: React.PropTypes.func,
        routes: React.PropTypes.array,
        view: React.PropTypes.string,
        onViewUpdate: React.PropTypes.func,
        controlsDisabled: React.PropTypes.bool
    },

    _onTravelModeUpdate: function (event, key, payload) {
        this.props.onTravelModeUpdate(payload);
    },

    _onToggleRoutePlanner: function () {
        this._onViewUpdate(ViewType.ROUTE_PLANNER);
    },

    _onToggleElevationCalculator: function () {
        this._onViewUpdate(ViewType.ELEVATION_CALCULATOR);
    },

    _onViewUpdate: function (view) {
        if (this.props.controlsDisabled === false && this.props.view !== view) {
            this.props.onViewUpdate(view);
        }
    },

    _routePlannerPanel: function () {
        return (
            this.props.view === ViewType.ROUTE_PLANNER &&
            <Box auto={true}>
                <Flex column={true} px={2} py={2}>
                    <Box>
                        <span className="label">Travel mode:</span>
                    </Box>
                    <Box>
                        <SelectField
                                value={this.props.travelMode}
                                onChange={this._onTravelModeUpdate}
                                disabled={this.props.controlsDisabled}>
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
                    <Box pt={2} pb={0}>
                        <span className="label">Distance:</span>
                        {formatters.formatDistance(this.props.distance)}
                    </Box>
                    <Box py={0}>
                        <span className="label">Elevation gain:</span>
                        {this.props.elevationGain}m
                    </Box>
                    <Box pt={0} pb={2}>
                        <span className="label">Elevation loss:</span>
                        {this.props.elevationLoss}m
                    </Box>
                    <Box py={2}>
                        <RaisedButton
                                label="Plot accurate elevation chart"
                                onClick={this.props.onSidebarPlotAccurateElevationChart}
                                title={"Fetch the elevation data for the full path (not just " +
                                    "the simplified one) and plot the accurate elevation chart"}
                                disabled={ !this.props.routeExists || this.props.controlsDisabled }
                        />
                    </Box>
                    <Box py={2}>
                        <RaisedButton
                                label="Delete route"
                                onClick={this.props.onRoutesDelete}
                                title="Delete the current route"
                                disabled={ !this.props.routeExists || this.props.controlsDisabled }
                        />
                    </Box>
                    <Box pt={2} pb={1}>
                        <RaisedButton
                                label="Export GPX"
                                onClick={this.props.onSidebarExportGpx}
                                title="Export the current route as GPX"
                                disabled={ !this.props.routeExists || this.props.controlsDisabled }
                        />
                    </Box>
                    <Box pt={1} pb={2}>
                        <RaisedButton
                                label="Export route sheet"
                                onClick={this.props.onSidebarExportRouteSheet}
                                title="Export the route sheet (aka directions)"
                                disabled={ !this.props.routeExists || this.props.controlsDisabled }
                        />
                    </Box>
                    <Flex py={2} align="center">
                        <Box>
                            <span className="label" style={{ fontWeight: "bold" }}>
                                Help
                            </span>
                        </Box>
                        <Box>
                            <RoutePlannerTooltip />
                        </Box>
                    </Flex>
                    <Flex py={2} align="center">
                        <Box>
                            <span className="label" style={{ fontWeight: "bold" }}>
                                About
                            </span>
                        </Box>
                        <Box>
                            <AboutTooltip />
                        </Box>
                    </Flex>
                </Flex>
            </Box>
        );
    },

    _elevationCalculatorPanel: function () {
        return (
            this.props.view === ViewType.ELEVATION_CALCULATOR &&
            <Box auto={true}>
                <Flex column={true} px={2} py={2}>
                    <Box>
                        <span className="label">Work in progress:</span>
                    </Box>
                    <Box>
                        <span className="label">Work in progress</span>
                    </Box>
                </Flex>
            </Box>
        );
    },

    render: function () {
        const sidebarClassnames = classnames({
            "verticalSidebarButtonContainer": true,
            "verticalSidebarOpened": this.props.controlsOpened,
            "verticalSidebarClosed": !this.props.controlsOpened
        });

        return (
            <div>
                {
                    this.props.controlsOpened &&
                    <div className="verticalSidebar">
                        <Flex flexColumn={true}>
                            <Box>
                                <AppBar title="Route Planner"/>
                            </Box>
                            { this._routePlannerPanel() }
                            <Box>
                                <AppBar title="Elevation Calculator" />
                            </Box>
                            { this._elevationCalculatorPanel() }
                        </Flex>
                    </div>
                }
                <div className={sidebarClassnames}>
                    <SidebarButton open={this.props.controlsOpened}
                            onToggle={this.props.onToggleControls}
                    />
                </div>
            </div>
        );
    }
});
module.exports = Sidebar;
