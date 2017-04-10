"use strict";

var React = require("react");
var Tooltip = require("react-portal-tooltip");

var ApiKeyTooltip = React.createClass({
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
                <img id="apiKeyTooltip"
                        width="18"
                        src={require("../images/tooltip.svg")}
                        onMouseEnter={this._showTooltip}
                        onMouseLeave={this._hideTooltip} />
                <Tooltip active={this.state.tooltipActive}
                        position="bottom"
                        arrow="center"
                        parent="#apiKeyTooltip">
                    <div style={{ maxWidth: "400px" }}>
                        The page uses
                        the <a href="https://developers.google.com/maps/documentation/javascript/" target="_blank">
                            Google Maps APIs
                        </a> to display the map, to build the route and to calculate
                        the elevation profile. Since a free account can make a limited number
                        of API requests, I cannot configure this page to use a global account,
                        and hence you need to configure it with your own account.
                        <br />
                        <br />
                        To create a free Google Maps APIs
                        account, <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank">
                            get an API key
                        </a>, then enter it in the field on the left.
                        <br />
                        <br />
                        <strong>Your API key is not stored, not sent to any service other than
                            the Google Maps APIs service.</strong>
                    </div>
                </Tooltip>
            </div>
        );
    }
});

module.exports = ApiKeyTooltip;
