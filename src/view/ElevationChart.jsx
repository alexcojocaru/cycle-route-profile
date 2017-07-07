"use strict";

const React = require("react");
const Line = require("./chart/ChartJs.jsx");
const _ = require("underscore");

const logger = require("../util/logger").logger("ElevationChart");
const hashFull = require("../util/hash").hashFullPoints;
const parsers = require("../util/elevationParsers");


const ElevationChart = React.createClass({
    propTypes: {
        elevations: React.PropTypes.array,
        distance: React.PropTypes.number,
        onHighlightActiveChartPoint: React.PropTypes.func
    },

    activeRoutePoint: null, // the point to highlight as the mouse cursor is over a route
    disableHighlightEvent: false,

    _onHighlightActivePoint: function (point) {
        if (this.chart && this.activeRoutePoint !== point) {
            logger.trace("Highlighting point:", point);

            this.activeRoutePoint = point;

            const closestPoint = parsers.findClosestPoint(this.props.elevations, point);

            // I don't want the highlight event to be triggered back through the onHover
            this.disableHighlightEvent = true;

            // the hack below is described in
            // https://stackoverflow.com/questions/34679293/how-to-programmatically-make-a-line-chart-point-active-highlighted
            const chart = this.chart.chart_instance;
            chart.getDatasetMeta(0).controller.highlightPoint(closestPoint.index);

            this.disableHighlightEvent = false;
        }
    },

    _getLatLngLabels: function (tooltipItems) {
        let labels;
        if (tooltipItems && tooltipItems.length > 0) {
            const point = this.props.elevations[tooltipItems[0].index];
            const lat = point.lat.toFixed(6);
            const lng = point.lng.toFixed(6);
            labels = [`Lat: ${lat} N`, `Lng: ${lng} E`];
        }
        else {
            labels = ["Lat: N/A", "Lng: N/A"];
        }
        return labels;
    },

    _getElevationGradeDistanceLabels: function (tooltipItem) {
        let labels;
        if (tooltipItem) {
            const point = this.props.elevations[tooltipItem.index];
            const ele = point.ele.toLocaleString();
            const grade = this.grades[tooltipItem.index].toFixed(1);
            labels = [
                `Elevation: ${ele}m`,
                `Grade: ${grade}%`,
                `Distance: ${parsers.formatDistance(this.pointDistance * tooltipItem.index)}k`
            ];
        }
        else {
            labels = ["Elevation: N/A", "Grade: N/A", "Distance: N/A"];
        }
        return labels;
    },

    _getNewTooltipPosition: function (tooltip) {
        const chartWidth = this.chart.chart_instance.chart.width;

        // show the tooltip in the top right corner if the point in the first half,
        // and vice-versa

        const y = 3; // always at the top
        const x = tooltip.caretX < chartWidth / 2 ? chartWidth - tooltip.width - 3 : 3;

        return {x: x, y: y};
    },

    _getXTickLabel: function (distance, index, distances) {
        const label = `${parsers.formatDistance(distance)}k`;
        if (distances.length <= 1) {
            return label;
        }
        else {
            const stepSize = distances[1] - distances[0];

            // if this is the second last item,
            // and the distance between this and the last item is less than 1/4 of step size,
            // hide it
            return distance === _.last(_.initial(distances))
                    && (_.last(distances) - distance) <= stepSize / 4
                ? ""
                : label;
        }
    },

    _getYTickLabel: function (elevation) {
        return this.maxElevation - this.minElevation >= 2000
                ? `${parsers.formatDistance(elevation)}k`
                : `${elevation}`;
    },

    shouldComponentUpdate: function (nextProps) {
        return nextProps.controlsDisabled === false
                && (this.props.elevations.length !== nextProps.elevations.length
                    || hashFull(this.props.elevations) !== hashFull(nextProps.elevations));
    },

    // TODO
    // show the horizontal and vertical line (sight like) on chart
    // fix the grade calculation - it's too extreme
    //      calculate the true distance between two geodesic points

    render: function () {
        logger.debug("elevation chart render; props:", this.props);

        const self = this;

        if (_.isEmpty(this.props.elevations)) {
            return (
                <div />
            );
        }

        const pointDistance = parsers.pointDistance(
                this.props.distance,
                this.props.elevations.length);
        this.pointDistance = pointDistance;

        const elevations = parsers.buildElevationData(this.props.elevations, pointDistance);

        const grades = parsers.buildGradesList(this.props.elevations, pointDistance);
        this.grades = grades;

        const minElevation = _.min(_.pluck(this.props.elevations, "ele"));
        this.minElevation = minElevation;
        const maxElevation = _.max(_.pluck(this.props.elevations, "ele"));
        this.maxElevation = maxElevation;

        const backgroundColors = parsers.buildBackgroundColorList(grades);

        const lineData = {
            datasets: [{
                fill: true,
                backgroundColor: backgroundColors,

                data: elevations,

                lineTension: 0,
                borderCapStyle: 'butt',
                borderColor: '#777',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                borderWidth: 1,
                pointBackgroundColor: '#777',
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgba(220,220,220,1)',
                pointHoverBorderColor: '#777',
                pointHoverBorderWidth: 1,
                pointRadius: 0,
                pointHitRadius: 10
            }]
        };

        const xAxesStepSize = parsers.calculateDistanceStepSize(this.props.distance, 7);

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: false
            },
            title: {
                display: false
            },
            hover: {
                // these 2 config props should match the corresponding ones on tooltips
                intersect: false,
                mode: "index",
                onHover: function (event, activeElements) {
                    if (self.disableHighlightEvent === true) {
                        return;
                    }
                    
                    if (activeElements && activeElements.length > 0) {
                        const index = activeElements[0]._index;
                        self.props.onHighlightActiveChartPoint(self.props.elevations[index]);
                    }
                    else {
                        self.props.onHighlightActiveChartPoint(null);
                    }
                }
            },
            tooltips: {
                // these 2 config props should match the corresponding ones on hover
                intersect: false,
                mode: "index",
                displayColors: false,
                custom: function (tooltip) {
                    // it looks like the width can be undefined (if the tooltip is not showing)
                    if (!tooltip || !tooltip.width) {
                        return;
                    }

                    const {x, y} = self._getNewTooltipPosition(tooltip);
                    tooltip.x = x;
                    tooltip.y = y;
                },
                callbacks: {
                    title: tooltipItems => self._getLatLngLabels(tooltipItems),
                    label: tooltipItem => self._getElevationGradeDistanceLabels(tooltipItem)
                }
            },
            scales: {
                xAxes: [{
                    type: "linear",
                    position: "bottom",
                    gridLines: {
                        tickMarkLength: 5,
                        drawBorder: false
                    },
                    ticks: {
                        min: 0,
                        max: this.props.distance,
                        stepSize: xAxesStepSize,
                        callback: (distance, index, distances) =>
                                self._getXTickLabel(distance, index, distances)
                    },
                    // No need for the override below; setting the ticks.max has the same effect
                    /*
                    afterBuildTicks: scale => {
                        // replace the last tick (which is past the last chart point)
                        // with a tick right on the last chart point
                        if (Array.isArray(scale.ticks) && scale.ticks.length >= 0) {
                            scale.ticks[scale.ticks.length - 1] = this.props.distance;
                        }
                    },
                    */
                }],
                yAxes: [{
                    type: "linear",
                    position: "left",
                    gridLines: {
                        tickMarkLength: 5,
                        drawBorder: false
                    },
                    ticks: {
                        callback: elevation => self._getYTickLabel(elevation)
                    }
                }]
            }
        };
        return (
            <Line ref={ chart => { this.chart = chart; window.chart = chart } }
                    data={lineData}
                    options={options}
                    redraw={true} />
        );
    }
});

module.exports = ElevationChart;
