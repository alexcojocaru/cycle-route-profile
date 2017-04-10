"use strict";

var React = require("react");
var FlatButton = require("material-ui/FlatButton").default;
var RaisedButton = require("material-ui/RaisedButton").default;
var TextField = require("material-ui/TextField").default;
var Box = require("reflexbox").Box;
var Flex = require("reflexbox").Flex;
var ApiKeyTooltip = require("../tooltip/ApiKeyTooltip.jsx");

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
            <Flex align="center" px={2}>
                <Box>
                    <span className="label">API key</span>
                </Box>
                <Box>
                    <TextField
                            name="apiKey"
                            type={this.props.isApiKeySaved ? "password" : "text"}
                            value={this.props.apiKey}
                            onChange={this._onChange}
                            disabled={this.props.isMapsApiLoaded}
                            style = {{width: 380}}
                    />
                </Box>
                <Box>
                    <ApiKeyTooltip />
                </Box>
                <Box pl={2}>
                    <RaisedButton
                            label="Load Map"
                            onClick={this._onLoadMap}
                            disabled={
                                this.props.isMapsApiLoaded || this.props.isApiKeyValid === false
                            }
                    />
                </Box>
            </Flex>
        );
    }
});

module.exports = ApiKey;
