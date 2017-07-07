"use strict";

var React = require("react");
var Tooltip = require("react-portal-tooltip");

var AboutTooltip = React.createClass({
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
                <img id="aboutTooltip"
                        width="18"
                        src={require("../images/tooltip.svg")}
                        onMouseEnter={this._showTooltip}
                        onMouseLeave={this._hideTooltip} />
                <Tooltip active={this.state.tooltipActive}
                        position="right"
                        arrow="top"
                        parent="#aboutTooltip">
                    <div style={{ maxWidth: "400px" }}>
                        <strong>Cycle Route Planner</strong>
                        <br /><br />
                        For details, see
                        the <a href="https://github.com/alexcojocaru/cycle-route-planner" target="_blank">
                            project page
                        </a> on GitHub.
                    </div>
                </Tooltip>
            </div>
        );
    }
});

module.exports = AboutTooltip;
