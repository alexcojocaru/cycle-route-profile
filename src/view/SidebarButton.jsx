"use strict";

var React = require("react");
var Tooltip = require("react-portal-tooltip");


var SidebarButton = React.createClass({
    propTypes: {
        open: React.PropTypes.bool,
        onToggle: React.PropTypes.func
    },

    _showTooltip: function () {
        this.setState({ tooltipActive: true });
    },

    _hideTooltip: function () {
        this.setState({ tooltipActive: false });
    },

    _onToggle: function () {
        this._hideTooltip();
        this.props.onToggle();
    },

    getInitialState: function () {
        return {
            tooltipActive: false
        };
    },

    render: function () {
        const tooltip = this.props.open
                ? "Close the sidebar"
                : "Show the route options";
        const imgSrc = this.props.open
                ? require("../images/arrow-left.png")
                : require("../images/arrow-right.png");
        return (
            <div>
                <img id="sidebarButton"
                        className="verticalSidebarButton"
                        src={imgSrc}
                        onClick={this._onToggle}
                        onMouseEnter={this._showTooltip}
                        onMouseLeave={this._hideTooltip} />
                <Tooltip active={this.state.tooltipActive}
                        position="right"
                        arrow="center"
                        parent="#sidebarButton">
                    {tooltip}
                </Tooltip>
            </div>
        );
    }
});

module.exports = SidebarButton;
