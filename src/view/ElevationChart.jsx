"use strict";

const React = require("react");
const Line = require("./chart/ChartJs.jsx");
const _ = require("underscore");

const logger = require("../util/logger").logger("ElevationChart");
const hashFull = require("../util/hash").hashFullPoints;


const ElevationChart = React.createClass({
    propTypes: {
        elevations: React.PropTypes.array,
        distance: React.PropTypes.number
    },

    shouldComponentUpdate: function (nextProps) {
        return nextProps.controlsDisabled === false
                && (this.props.elevations.length !== nextProps.elevations.length
                    || hashFull(this.props.elevations) !== hashFull(nextProps.elevations));
    },

    // TODO
    // allow dragging the horizontal separator between the map and the chart
    // disable the tooltip on points, and instead display a fixed tooltip in the top left/right corner
    // refactor / move code to helpers
    //      add tests
    // handle event:
    //   - on mouse move along line, move the waypoint on the route
    //   - on mouse move along the route, move the point on the chart line
    // fix the grade calculation - it's too extreme
    //      calculate the true distance between two points based on their geo coordinates

    render: function () {
        logger.debug("elevation chart render; props:", this.props);

        const self = this;

        if (_.isEmpty(this.props.elevations)) {
            return (
                <div id="elevation-chart">
                    <div style={{ height: `${chartHeight}px` }}></div>
                </div>
            );
        }

        const gradeColors = {
            // 9% and above grade
            a9: '#ff0000',
            // 6% and above grade
            a6: '#ffc000',
            // 3% and above grade
            a3: '#fff000',
            // flat-ish
            a0: '#00ff00',
            // -3% and above grade
            am3: '#00ffd8',
            // -6% and above grade
            am6: '#00ccff',
            // below -6% grade
            am: '#0000ff'
        };

        // the distance between the equidistant points in the elevations list
        const segmentLength = this.props.distance / (this.props.elevations.length - 1);

        const elevations = _.map(this.props.elevations, (point, index) => {
            return { x: index * segmentLength, y: point.ele }
        });
        logger.trace("elevations to plot:", elevations);

        const grades = _.map(this.props.elevations, (point, index, list) => {
            let grade;

            // first point doesn't have a grade
            if (index === 0) {
                grade = 0;
            }
            else {
                const previous = list[index - 1];
                grade = 100 * (point.ele - previous.ele) / segmentLength;
            }
            
            return grade;
        });
        logger.trace("grades to use for filling:", grades);

        const minElevation = _.min(_.pluck(this.props.elevations, "ele"));
        const maxElevation = _.max(_.pluck(this.props.elevations, "ele"));

        // the fill colors are shifted to the left by 1 compared to the grades
        // (eg. the fill color for point n on the chart is the color of the grade for point n+1)
        const backgroundColors = _.map(_.rest(grades), grade => {
            let color;

            if (grade >= 9) {
                color = gradeColors.a9;
            }
            else if (grade >= 6) {
                color = gradeColors.a6;
            }
            else if (grade >= 3) {
                color = gradeColors.a3;
            }
            else if (grade >= 0) {
                color = gradeColors.a0;
            }
            else if (grade >= -3) {
                color = gradeColors.am3;
            }
            else if (grade >= -6) {
                color = gradeColors.am6;
            }
            else {
                color = gradeColors.am;
            }

            return color;
        });
        // add one more color, for completeness (it will never be used on the chart)
        backgroundColors.push(gradeColors.a0);
        logger.trace("background colors to use for filling:", backgroundColors);

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
                pointHoverRadius: 3,
                pointHoverBackgroundColor: 'rgba(220,220,220,1)',
                pointHoverBorderColor: '#777',
                pointHoverBorderWidth: 1,
                pointRadius: 0,
                pointHitRadius: 10
            }]
        };

        const availableStepSize = [
            100000,
            50000,
            25000,
            20000,
            10000,
            5000,
            2500,
            2000,
            1000,
            500
        ];

        let xAxesStepSize;
        // find a good step size for horizontal ticks/gridlines,
        // so that we have at least 7 of them on the x axis;
        // the last one is used as default if none of the previous ones match
        for (let stepSizeIndex = 0; stepSizeIndex < availableStepSize.length; stepSizeIndex++) {
            xAxesStepSize = availableStepSize[stepSizeIndex];
            if (this.props.distance / xAxesStepSize > 7) {
                break;
            }
        }

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: false
            },
            title: {
                display: false
            },
            tooltips: {
                displayColors: false,
                callbacks: {
                    title: (tooltipItems) => {
                        let title;
                        if (tooltipItems && tooltipItems.length > 0) {
                            const point = self.props.elevations[tooltipItems[0].index];
                            const lat = point.lat.toFixed(6);
                            const lng = point.lng.toFixed(6);
                            title = [`Lat: ${lat} N`, `Lng: ${lng} E`];
                        }
                        else {
                            title = ["Lat: N/A", "Lng: N/A"];
                        }
                        return title;
                    },
                    label: (tooltipItem) => {
                        let label;
                        if (tooltipItem) {
                            const point = self.props.elevations[tooltipItem.index];
                            const ele = point.ele.toLocaleString();
                            const grade = grades[tooltipItem.index].toFixed(1);
                            label = [
                                `Elevation: ${ele}m`,
                                `Grade: ${grade}%`,
                                `Distance: ${Math.round(segmentLength * tooltipItem.index / 100) / 10}k`
                            ];
                        }
                        else {
                            label = ["Elevation: N/A", "Grade: N/A", "Distance: N/A"];
                        }
                        return label;
                    }
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
                        callback: (distance, index, distances) => {
                            // if this is the second last item,
                            // and the distance between this and the last item is less than 1/4 of step size,
                            // hide it
                            const label = `${Math.round(distance / 100) / 10}k`;
                            if (distances.length <= 1) {
                                return label;
                            }
                            else {
                                const stepSize = distances[1] - distances[0];
                                return distance === _.last(_.initial(distances)) && (_.last(distances) - distance) <= stepSize / 4
                                        ? ""
                                        : label;
                            }
                        }
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
                        callback: elevation => {
                            return maxElevation - minElevation >= 2000
                                    ? `${Math.round(elevation / 100) / 10}k`
                                    : `${elevation}`;
                        }
                    }
                }]
            }
        };

        return (
            <div id="elevation-chart">
                <Line data={lineData} options={options} redraw={true} />
            </div>
        );
    }
});

module.exports = ElevationChart;
