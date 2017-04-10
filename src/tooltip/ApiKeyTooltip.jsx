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
                        </a> to display the map, to build the route and to get the elevation data.
                        Since a free account can make a limited number
                        of API requests, I cannot configure this application to use a global account,
                        and hence you need to configure it with your own account.
                        <br />
                        <br />
                        To get a free Google Maps API key, follow these steps:
                        <ol>
                            <li>
                                Go to the <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank">
                                    Get API Key
                                </a> page.
                            </li>
                            <li>
                                Click the <strong>GET A KEY</strong> button
                                (which will ask you to sign in if you are not).
                            </li>
                            <li>
                                Create a new project (name it anyway you want) and enable the API on it.
                            </li>
                        </ol>
                        Once the API key has been generated, copy and paste it
                        into the field on the left and click <strong>LOAD MAP</strong> on the right
                        to load the Google Map.
                        <br />
                        <br />
                        <strong>Your API key is not stored, nor sent to any service other than
                            the Google Maps APIs service.</strong>
                    </div>
                </Tooltip>
            </div>
        );
    }
});

module.exports = ApiKeyTooltip;
