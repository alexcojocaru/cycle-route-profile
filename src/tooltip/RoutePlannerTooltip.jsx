"use strict";

var React = require("react");
var Tooltip = require("react-portal-tooltip");

var RoutePlannerTooltip = React.createClass({
    _showTooltip: function () {
        this.setState({ tooltipActive: true });
    },

    _hideTooltip: function () {
        this.setState({ tooltipActive: false });
    },

    getInitialState: function () {
        return {
            tooltipActive: false
        };
    },

    render: function () {
        return (
            <div>
                <img id="helpTooltip"
                        width="18"
                        src={require("../images/tooltip.svg")}
                        onMouseEnter={this._showTooltip}
                        onMouseLeave={this._hideTooltip} />
                <Tooltip active={this.state.tooltipActive}
                        position="right"
                        arrow="top"
                        parent="#helpTooltip">
                    <div style={{ maxWidth: "400px" }}>
                        Once you enter the API key and load the map, left click on the map
                        to choose the start and the end points of the route.
                        The page will draw the route between the two selected points
                        with the travel mode selected in the drop down above.
                        <br /><br />
                        Drag any point on the route (in blue) to add a waypoint.
                        To drag the end points (start and finish), drag the white dot
                        and not the green/red marker.
                        <br /><br />
                        Click on a waypoint to delete it.
                    </div>
                </Tooltip>
            </div>
        );
    }
});

module.exports = RoutePlannerTooltip;
