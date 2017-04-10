"use strict";

const React = require("react");
const Line = require("./chart/ChartJs.jsx");
const _ = require("underscore");

const logger = require("../util/logger").logger("ElevationChart");


const ElevationChart = React.createClass({
    propTypes: {
        routes: React.PropTypes.array
    },

    shouldComponentUpdate: function (nextProps) {
        // TODO avoid rendering while elevations are being fetched
        return true;
    },

    // TODO
    // avoid rendering the chart if the data is empty, to avoid the initial error
    // handle event:
    //   - on mouse move along line, move the waypoint on the route
    //   - on mouse move along the route, move the point on the chart line
    // export to PNG or open in new window
    // refactor / move code to helpers
    // disable the tooltip on points, and instead display a fixed tooltip in the top left/right corner
    // fix the grade calculation - it's too extreme

    render: function () {
        logger.debug("elevation chart render");

        const self = this;

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

        // TODO set x as the distance, not the index
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
                        callback: distance => `${Math.round(distance / 100) / 10}k`
                    },
                    afterBuildTicks: scale => {
                        // replace the last tick (which is past the last chart point)
                        // with a tick right on the last chart point
                        if (Array.isArray(scale.ticks) && scale.ticks.length >= 0) {
                            scale.ticks[scale.ticks.length - 1] = this.props.distance;
                        }
                    },
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
                <Line data={lineData} options={options} height={200} redraw={true} />
            </div>
        );
    }
});

module.exports = ElevationChart;
