"use strict";

var React = require("react");
var RaisedButton = require("material-ui/RaisedButton").default;
var TextField = require("material-ui/TextField").default;
var Box = require("reflexbox").Box;
var Flex = require("reflexbox").Flex;

var ApiKey = React.createClass({
    propTypes: {
        apiKey: React.PropTypes.string,
        isApiKeyValid: React.PropTypes.bool,
        isApiKeySaved: React.PropTypes.bool,
        isMapsApiLoaded: React.PropTypes.bool.isRequired,
        onChange: React.PropTypes.func.isRequired,
        onLoadMap: React.PropTypes.func.isRequired
    },

    _onChange: function (event, payload) {
        this.props.onChange(payload);
    },

    _onLoadMap: function () {
        this.props.onLoadMap();
    },

    getDefaultProps: function () {
        return {
            isApiKeySaved: false
        };
    },

    render: function () {
        return (
            (this.props.isMapsApiLoaded === false) &&
            <Flex column={true}>
                <Box pt={2}>
                    <Flex align="center" px={2}>
                        <Box>
                            <span className="label">API key</span>
                        </Box>
                        <Box>
                            <TextField name="apiKey"
                                    type="text"
                                    value={this.props.apiKey}
                                    onChange={this._onChange}
                                    style = {{ width: "380px" }}
                            />
                        </Box>
                        <Box pl={2}>
                            <RaisedButton label="Load Map"
                                    onClick={this._onLoadMap}
                                    disabled={this.props.isApiKeyValid === false}
                            />
                        </Box>
                    </Flex>
                </Box>
                <Box px={2} pt={2}>
                    The page uses
                    the <a href="https://developers.google.com/maps/documentation/javascript/" target="_blank">
                        Google Maps APIs
                    </a> to display the map, to build the route and to get the elevation data.
                    Since a free account can make a limited number
                    of API requests, I cannot configure this application to use a global
                    account, and hence you need to configure it with your own account.
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
                            Create a new project (name it anyway you want)
                            and enable the API on it.
                        </li>
                    </ol>
                    Once the API key has been generated, copy and paste it
                    into the field on the left and click <strong>LOAD MAP</strong> on the right
                    to load the Google Map.
                    <br />
                    <br />
                    <strong>Your API key is not stored, nor sent to any service other than
                        the Google Maps APIs service.</strong>
                </Box>
            </Flex>
        );
    }
});

module.exports = ApiKey;
