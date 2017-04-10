"use strict";

var React = require("react");
var Flex = require("reflexbox").Flex;
var Box = require("reflexbox").Box;
var Paper = require("material-ui/Paper").default;
var FlatButton = require("material-ui/FlatButton").default;
var EndpointType = require("../constant/routePlannerConstant").EndpointType;

/**
 * @desc The dialog to select one of the route endpoints.
 *    It is displayed as a div floating on the map, positioned through CSS.
 */
var RoutePointSelection = React.createClass({
    propTypes: {
        endpointSelectionDialogVisible: React.PropTypes.bool,
        endpointSelectionDialogLocation: React.PropTypes.object,
        onCloseEndpointSelectionDialog: React.PropTypes.func,
        onUpdateEndpoint: React.PropTypes.func
    },

    _onMarkerTypeSelectStart: function () {
        this.props.onCloseEndpointSelectionDialog();
        this.props.onUpdateEndpoint(EndpointType.START);
    },

    _onMarkerTypeSelectFinish: function () {
        this.props.onCloseEndpointSelectionDialog();
        this.props.onUpdateEndpoint(EndpointType.FINISH);
    },

    _onMarkerTypeClose: function () {
        this.props.onCloseEndpointSelectionDialog();
    },

    componentDidMount: function () {
        this.boundingRect = this.container.getBoundingClientRect();
    },

    render: function () {
        let top = this.props.endpointSelectionDialogLocation.y;
        let left = this.props.endpointSelectionDialogLocation.x;

        // if the dialog doesn't fit to the right or under, put it to the left / above
        if (this.props.endpointSelectionDialogVisible) {
            if (top + this.boundingRect.height >= window.innerHeight) {
                top -= this.boundingRect.height;
            }
            if (left + this.boundingRect.width >= window.innerWidth) {
                left -= this.boundingRect.width;
            }
        }

        const style = {
            position: "absolute",
            visibility: this.props.endpointSelectionDialogVisible ? "visible" : "hidden",
            zIndex: "100",
            top: `${top}px`,
            left: `${left}px`,
            padding: "15px"
        };

        return (
            <Paper style={style} transitionEnabled={false}>
                <div ref={ container => { this.container = container; } }>
                    <Flex pb={2} align="center">
                        <Box auto={true}>
                            <span className="dialogTitle">Endpoint selection</span>
                        </Box>
                        <Box>
                            <input type="button"
                                    onClick={this._onMarkerTypeClose}
                                    value="X"
                                    title="Close"
                                    style={{ fontWeight: "bold" }}
                            />
                        </Box>
                    </Flex>
                    <div className="label">Which route endpoint is this?</div>
                    <Flex pt={2} align="center" justify="center">
                        <Box px={1}>
                            <FlatButton label="Start" onClick={this._onMarkerTypeSelectStart} />
                        </Box>
                        <Box px={1}>
                            <FlatButton label="Finish" onClick={this._onMarkerTypeSelectFinish} />
                        </Box>
                    </Flex>
                </div>
            </Paper>
        );
    }
});

module.exports = RoutePointSelection;
