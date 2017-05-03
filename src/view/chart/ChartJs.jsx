/* eslint-disable */
// this code is copy-pasted from elsewhere

"use strict";

const React = require("react");
const ReactDOM = require("react-dom");

const Chart = require("chart.js");
const ChartComponent = require("react-chartjs-2").default;


/*
 * Add support for multiple background colors under the line chart:
 * https://github.com/chartjs/Chart.js/issues/4068
 * https://codepen.io/jordanwillis/pen/BWxErp
 */


// decimal rounding algorithm
// see: https://plnkr.co/edit/uau8BlS1cqbvWPCHJeOy?p=preview
var roundNumber = function (num, scale) {
  var number = Math.round(num * Math.pow(10, scale)) / Math.pow(10, scale);
  if(num - number > 0) {
    return (number + Math.floor(2 * Math.round((num - number) * Math.pow(10, (scale + 1))) / 10) / Math.pow(10, scale));
  } else {
    return number;
  }
};

// save the original line element so we can still call it's 
// draw method after we build the linear gradient
var origLineElement = Chart.elements.Line;

// define a new line draw method so that we can build a linear gradient
// based on the position of each point
Chart.elements.Line = Chart.Element.extend({
  draw: function() {
    var backgroundColors = this._chart.controller.data.datasets[this._datasetIndex].backgroundColor;

    if (Array.isArray(backgroundColors) === false || backgroundColors.length === 0) {
      origLineElement.prototype.draw.apply(this);
      return;
    }

    var vm = this._view;
    var points = this._children;
    var ctx = this._chart.ctx;
    var minX = points[0]._model.x;
    var maxX = points[points.length - 1]._model.x;
    var linearGradient = ctx.createLinearGradient(minX, 0, maxX, 0);

    // iterate over each point to build the gradient
    points.forEach(function(point, i) {
      var backgroundColor = backgroundColors[i % backgroundColors.length];

      // `addColorStop` expects a number between 0 and 1, so we
      // have to normalize the x position of each point between 0 and 1
      // and round to make sure the positioning isn't too precise 
      // (otherwise it won't line up with the point position)
      var colorStopPosition = roundNumber((point._model.x - minX) / (maxX - minX), 2);

      // special case for the first color stop
      if (i === 0) {
        linearGradient.addColorStop(0, backgroundColor);
      } else {
        var previousBackgroundColor = backgroundColors[(i - 1) % backgroundColors.length];

        // only add a color stop if the color is different
        if (backgroundColor !== previousBackgroundColor) {
          // add a color stop for the prev color and for the new color at the same location
          // this gives a solid color gradient instead of a gradient that fades to the next color
          linearGradient.addColorStop(colorStopPosition, previousBackgroundColor);
          linearGradient.addColorStop(colorStopPosition, backgroundColor);
        }
      }
    });

    // save the linear gradient in background color property
    // since this is what is used for ctx.fillStyle when the fill is rendered
    vm.backgroundColor = linearGradient;

    // now draw the lines (using the original draw method)
    origLineElement.prototype.draw.apply(this);
  }
});

// we have to overwrite the datasetElementType property in the line controller
// because it is set before we can extend the line element (this ensures that 
// the line element used by the chart is the one that we extended above)
Chart.controllers.line = Chart.controllers.line.extend({
  datasetElementType: Chart.elements.Line,

  // the following is to support activating a point programmatically
  // http://stackoverflow.com/a/34687291
  fireHighlightEvent: function(x, y, canvas, eventType){
      var boundingRect = canvas.getBoundingClientRect();
      var mouseX = Math.round(
              (boundingRect.left + x) /
              (boundingRect.right - boundingRect.left) *
              canvas.width /
              this.chart.chart.currentDevicePixelRatio
      );
      var mouseY = Math.round(
              (boundingRect.top + y) /
              (boundingRect.bottom - boundingRect.top) *
              canvas.height /
              this.chart.chart.currentDevicePixelRatio
      );
      var oEvent = document.createEvent('MouseEvents');
      oEvent.initMouseEvent(eventType, true, true, document.defaultView,
              0, mouseX, mouseY, mouseX, mouseY,
              false, false, false, false, 0, canvas);
      canvas.dispatchEvent(oEvent);
    },
    highlightPoint: function(index) {
        var canvas = this.chart.chart.canvas;
        var points = this.chart.getDatasetMeta(0).data;
        // the 'click' event will highlight the new point
        if (index > -1) {
            var view = points[index]._view;
            this.highlightPointIndex = index;
            this.fireHighlightEvent(view.x, view.y, canvas, 'click');
        }
        // the 'mouseout' event will un-highlight the current point
        else if (this.highlightPointIndex > -1) {
            var view = points[this.highlightPointIndex]._view;
            this.highlightPointIndex = -1;
            this.fireHighlightEvent(view.x, view.y + 5, canvas, 'mouseout');
        }
    },
    // the index of the previously highlighted point
    highlightPointIndex: -1
});


ChartComponent.prototype.renderChart = function () {
    const {options, legend, type, redraw} = this.props;
    const node = ReactDOM.findDOMNode(this);
    const data = this.memoizeDataProps();

    this.chart_instance = new Chart(node, {
      type,
      data,
      options
    });
  };

class Line extends React.Component {
  render() {
    return (
      <ChartComponent
        {...this.props}
        ref={ref => this.chart_instance = ref && ref.chart_instance}
        type='line'
      />
    );
  }
};

module.exports = Line;
