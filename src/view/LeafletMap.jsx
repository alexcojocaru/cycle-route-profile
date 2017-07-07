"use strict";

require("leaflet/dist/leaflet.css");

var React = require("react");
var Map = require("react-leaflet").Map;
var TileLayer = require("react-leaflet").TileLayer;
var Marker = require("react-leaflet").Marker;

var LeafletMap = React.createClass({
    _onClick: function (event) {
        console.log(`click: ${event.latlng}`);
    },

    render: function () {
        const centre = L.latLng(49.2956, -123.1174);

        return (
            <div id="map-container">
                <Map id="map"
                        center={centre}
                        zoom={10}
                        onClick={this._onClick}>
                    <TileLayer url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" />
                    <Marker position={centre}
                            draggable={true}
                            icon={
                                L.icon({
                                    iconUrl: require("../images/waypoint.png")
                                })
                            }
                    />
                </Map>
            </div>
        );
    }
});
module.exports = LeafletMap;

// TODO
// providers:
//   http://{s}.tile.osm.org/{z}/{x}/{y}.png
//   http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png
//   http://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.{ext}
//   http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}
//   http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}
//   http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
//
// attribution in the sliding panel on the left
