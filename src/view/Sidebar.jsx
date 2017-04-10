"use strict";

var React = require("react");
var _ = require("underscore");
var classnames = require("classnames");

var Box = require("reflexbox").Box;
var Flex = require("reflexbox").Flex;
var RaisedButton = require("material-ui/RaisedButton").default;
var MenuItem = require("material-ui/MenuItem").default;
var SelectField = require("material-ui/SelectField").default;

var SidebarButton = require("./SidebarButton.jsx");
var RoutePlannerTooltip = require("../tooltip/RoutePlannerTooltip.jsx");
var TravelMode = require("../constant/routePlannerConstant").TravelMode;
var TravelModeLabel = require("../constant/routePlannerConstant").TravelModeLabel;
var TravelModePropValidator = require("../util/routeValidators").TravelModePropValidator;
var formatters = require("../util/routeFormatters");

var Sidebar = React.createClass({
    propTypes: {
        controlsOpened: React.PropTypes.bool,
        travelMode: TravelModePropValidator,
        routeExists: React.PropTypes.bool,
        distance: React.PropTypes.number,
        onToggleControls: React.PropTypes.func,
        onTravelModeUpdate: React.PropTypes.func,
        onRoutesDelete: React.PropTypes.func,
        controlsDisabled: React.PropTypes.bool
    },

    _onTravelModeUpdate: function (event, key, payload) {
        this.props.onTravelModeUpdate(payload);
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
                        <Flex column px={2} py={2}>
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
                            <Box py={2}>
                                <span className="label">Distance:</span>
                                {formatters.formatDistance(this.props.distance)}
                            </Box>
                            <Box py={2}>
                                <RaisedButton
                                        label="Delete route"
                                        onClick={this.props.onRoutesDelete}
                                        title="Delete the current route"
                                        disabled={
                                            !this.props.routeExists ||
                                                this.props.controlsDisabled
                                        }
                                />
                            </Box>
                            <Box py={2}>
                                <RaisedButton
                                        label="Export GPX"
                                        onClick={this._onExportGpx}
                                        title="Export the current route as GPX"
                                        disabled={
                                            !this.props.routeExists ||
                                                this.props.controlsDisabled
                                        }
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
