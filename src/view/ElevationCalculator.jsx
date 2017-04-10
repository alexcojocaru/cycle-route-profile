/* global google: false */
"use strict";

var React = require("react");
var _ = require("underscore");

var ToGeoJson = require("togeojson");
var Simplify = require("simplify-geojson");

const logger = require("../util/logger").logger("ElevationCalculator");

var ElevationCalculator = React.createClass({

    getInitialState: function () {
        return {
            // whether a drag over the upload area is in progress
            isDragActive: false,
            // the feedback messages
            feedback: [],
            // the Document built from the content of the uploaded GPX file
            gpxDocument: null,
            // the list of track points in the GPX file
            points: [],
            // the name of the uploaded GPX file
            fileName: "",
            // the API key
            apiKey: "",
            // true while the GPX file is being uploaded
            uploading: false,
            // true while the GPX file is being processed
            processing: false,
            // true to abort the GPX processing
            abort: false,
            // the index of the next trkpt to process in the GPX file
            pointIndex: 0
        };
    },

    // I remember reading something about a 2000 char limit for the URL for Google APIs;
    // this is a hardcoded limit, assumming the lat & long for each point are about 10 chars long.
    _maxPointsPerRequest: 90,

    /**
     * Update the corresponding points in the points list with the elevation results.
     * The elevations are rounded to the nearest int.
     * If the coordinates of a result and the corresponding point don't match, log a warning.
     * @param {array} results - the results from the elevation service
     * @param {number} lowerBound - the start index (inclusive) of the batch to process
     * @param {number} upperBound - the end index (exclusive) of the batch to process
     */
    _updateElevationCoordinates (results, lowerBound, upperBound) {
        var self = this;

        _.each(results, function (result, index) {
            var point = self.state.points[lowerBound + index];

            // compare the latitude and longitude of the current result and point;
            // they should match to the (and including) 5th decimal
            var resultLat = result.location.lat();
            var resultLon = result.location.lng();

            var pointLat = parseFloat(point.getAttribute("lat"));
            var pointLon = parseFloat(point.getAttribute("lon"));

            if (Math.round(resultLat * 10000) !== Math.round(pointLat * 10000) ||
                   Math.round(resultLon * 10000) !== Math.round(pointLon * 10000)) {
                logger.warn(
                        "Coordinates don't match for point at index",
                        (lowerBound + index), "and the corresponding result:",
                        "point={", pointLat, ",", pointLon, "},",
                        "result={", resultLat, ",", resultLon, "}");
            }

            point.setAttribute("ele", result.elevation.toFixed(2));
        });

        var msg = `Done processing the elevation coordinates for points ${
                lowerBound} ... ${upperBound}`;
        this.setState({
            feedback: [msg]
        });
    },

    /**
     * Makes a request to the Google Elevation API with the given range of points.
     * On error, abort the processing.
     * On success, do something with the results and schedule the processing of the next batch.
     * @param {number} lowerBound - the start index (inclusive) of the batch to process
     * @param {number} upperBound - the end index (exclusive) of the batch to process
     */
    _fetchElevations: function (lowerBound, upperBound) {
        var self = this;

        this.setState({
            feedback: [`Fetching the elevation coordinates for points ${
                    lowerBound} ... ${upperBound}`]
        });

        var locations = _.map(
                _.filter(
                    this.state.points,
                    function (point, index) {
                        return index >= lowerBound && index < upperBound;
                    }
                ),
                function (point) {
                    return {
                        lat: parseFloat(point.getAttribute("lat")),
                        lng: parseFloat(point.getAttribute("lon"))
                    };
                }
        );

        var elevator = new google.maps.ElevationService();
        elevator.getElevationForLocations({
            locations: locations
        }, function (results, status) {
            if (status === google.maps.ElevationStatus.OK) {
                self.setState({
                    feedback: [`Done fetching the elevation coordinates for points ${
                            lowerBound} ... ${upperBound}`]
                });

                self._updateElevationCoordinates(results, lowerBound, upperBound);
            }
            else {
                self.setState({
                    feedback: [`Google Elevation service failured due to ${status
                            }; giving up`],
                    abort: true
                });
            }

            // we're done processing this request; schedule the request for the next batch
            self.setState({
                pointIndex: upperBound
            }, function () {
                setTimeout(this._processPoints, 1000);
            });
        });
    },

    /**
     * Process the next batch of points
     * (the index of the first point in the batch is this.state.pointIndex),
     * and schedule the processing of the following one.
     */
    _processPoints: function () {
        // if we are out of range, we're done processing
        if (this.state.abort || (this.state.pointIndex >= this.state.points.length)) {
            this.setState({
                processing: false,
                pointIndex: 0,
                points: [],
                abort: false
            });
        }
        else {
            var lowerBound = this.state.pointIndex;
            var upperBound = Math.min(
                    lowerBound + this._maxPointsPerRequest,
                    this.state.points.length);

            this._fetchElevations(lowerBound, upperBound);
        }
    },

    /**
     * Start processing (in batches) the points in the GPX document.
     */
    _processGpx: function () {
        var self = this;

        this.setState({
            feedback: ["Processing track points"],
            processing: true,
            pointIndex: 0
        }, function () {
            self._processPoints();
        });
    },

    /**
     * Read the given file and parse its content into the gpxDocument state attribute.
     * The list of GPX points in the document is selected and set on the state.
     * @param {object} file - the file on the disk to read
     */
    _readFile: function (file) {
        var self = this;
        this.setState({
            uploading: true,
            fileName: file.name
        }, function () {
            var reader = new FileReader();
            reader.onerror = function () {
                self.setState({
                    gpxDocument: null,
                    uploading: false,
                    feedback: ["There has been an error processing the GPX file"]
                });
            };
            reader.onloadend = function () {
                var parser = new DOMParser();
                var doc = parser.parseFromString(reader.result, "application/xml");
                var points = doc.querySelectorAll("trkpt");

                self.setState({
                    gpxDocument: doc,
                    points: points,
                    uploading: false,
                    feedback: [`Done reading file; found ${points.length} points`],
                    geojson: Simplify(ToGeoJson.gpx(doc), 2)
                });
            };
            reader.readAsText(file);
        });
    },

    _onDragLeave: function () {
        this.setState({
            isDragActive: false
        });
    },

    _onDragOver: function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";

        this.setState({
            isDragActive: true
        });
    },

    _onDrop: function (e) {
        if (this.state.uploading) {
            return;
        }

        e.preventDefault();

        var files = (e.dataTransfer && e.dataTransfer.files) || (e.target && e.target.files);

        var error = false;

        var feedback = [];
        if (files && files.length > 1) {
            feedback.push("You can upload a single file");
        }
        else if (!files) {
            feedback.push("Your browser does not have support for file upload");
        }
        else {
            feedback.push("Reading file...");
        }

        this.setState({
            isDragActive: false,
            feedback: feedback
        }, function () {
            if (!error) {
                this._readFile(files[0]);
            }
        });
    },

    _onClick: function () {
        if (this.state.uploading) {
            return;
        }
        this.refs.fileInput.click();
    },

    _onApiKeyChange: function () {
        this.setState({
            apiKey: this.refs.apiKey.value,
            feedback: []
        });
    },

    /**
     * Validate the input.
     * @return {array} - an array of error messages, or empty if we're good
     */
    _validateInput: function () {
        var feedback = [];
        if (!this.state.apiKey) {
            feedback.push("You need to provide your API key");
        }
        if (!this.state.gpxDocument) {
            feedback.push("You need to upload a GPX file");
        }
        return feedback;
    },

    /**
     * After the input is validated, the Google Maps API is appended to the document body;
     * on load, it triggers the track point processing.
     */
    _onProcess: function () {
        if (this.state.processing) {
            this.setState({
                points: [],
                pointIndex: 0,
                abort: true
            });
        }
        else {
            var feedback = this._validateInput();
            if (feedback.length > 0) {
                this.setState({
                    feedback: feedback
                });
            }
            else {
                this.setState({
                    feedback: ["Loading Google Maps API"]
                }, function () {
                    var apiUrl = `https://maps.googleapis.com/maps/api/js?key=${
                            this.state.apiKey}&callback=processGpx`;
                    var script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = apiUrl;
                    document.body.appendChild(script);
                });
            }
        }
    },

    componentDidMount: function () {
        // exposing the freakin' function, to be called on load by the Google API script
        window.processGpx = this._processGpx;
    },

    render: function () {
        var style = {
            width: this.props.size || 100,
            height: this.props.size || 100,
            borderStyle: this.state.isDragActive ? "solid" : "dashed"
        };

        return (
            <div>
                <div>
                    {
                        _.each(this.state.feedback, function (msg) {
                            return <span>{msg}</span>;
                        })
                    }
                </div>
                <div>
                    <label htmlFor="apiKey">API key:</label>
                    <input ref="apiKey"
                            type="text"
                            size="50"
                            value={this.state.apiKey}
                            onChange={this._onApiKeyChange}
                            disabled={this.state.uploading} />
                </div>
                <div style={style}
                        onClick={this._onClick}
                        onDragLeave={this._onDragLeave}
                        onDragOver={this._onDragOver}
                        onDrop={this._onDrop}>
                    <input style={ { display: "none" } }
                            type="file"
                            ref="fileInput"
                            onChange={this._onDrop} />
                    <span>{this.state.fileName || "Drop a GPX file here or click to upload"}</span>
                </div>
                <input type="button"
                        ref="process"
                        value={this.state.processing ? "Abort" : "Process"}
                        onClick={this._onProcess}
                        disabled={this.state.uploading} />

                <br /><br /><br />

                <textarea readOnly="true" rows="40" cols="120" value={
                    JSON.stringify(this.state.geojson)
                } />

                <textarea readOnly="true" rows="40" cols="120" value={
                    this.state.gpxDocument &&
                        new XMLSerializer().serializeToString(this.state.gpxDocument)
                } />
            </div>
        );
    }
});

module.exports = ElevationCalculator;
