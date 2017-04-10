"use strict";

// reference the static assets, to be processed/bundled by the webpack plugins
require("./css/main.scss");

var React = require("react");
var ReactDOM = require("react-dom");

var Redux = require("redux");
var ReactRedux = require("react-redux");

var MuiThemeProvider = require("material-ui/styles").MuiThemeProvider;
var getMuiTheme = require("material-ui/styles").getMuiTheme;
var lightBaseTheme = require("material-ui/styles").lightBaseTheme;
var injectTapEventPlugin = require("react-tap-event-plugin");

var Tabs = require("material-ui/Tabs").Tabs;
var Tab = require("material-ui/Tabs").Tab;

var queryString = require("query-string");

var NotificationPanel = require("./view/NotificationPanel.jsx");

var store = require("./store/store");

var ViewType = require("./constant/containerConstant").ViewType;

var containerAction = require("./action/containerAction");
var apiKeyAction = require("./action/apiKeyAction");
var routePlannerAction = require("./action/routePlannerAction");
var notificationAction = require("./action/notificationAction");

var ApiKeyView = require("./view/ApiKey.jsx");
var RoutePlannerView = require("./view/RoutePlanner.jsx");
var ElevationCalculatorView = require("./view/ElevationCalculator.jsx");


var App = React.createClass({
    _loadMap: function () {
        if (this.props.isApiKeyValid) {
            this.apiKeyAction.loadMap(this.props.currentApiKey);
        }
    },

    _buildContent: function () {
        var view;
        switch (this.props.view) {
            case ViewType.ROUTE_PLANNER:
                var props = {
                    isMapsApiLoaded: this.props.isMapsApiLoaded,
                    travelMode: this.props.travelMode,
                    routeExists: this.props.routeExists,
                    routes: this.props.routes,
                    distance: this.props.distance,
                    onWaypointDelete: this.routePlannerAction.deleteWaypoint,
                    onRouteUpdate: this.routePlannerAction.updateRoute,
                    onRoutesDelete: this.routePlannerAction.deleteRoutes,
                    onTravelModeUpdate: this.routePlannerAction.updateTravelMode,
                    onNotification: this.notificationAction.addNotification,
                    endpointSelectionDialogVisible: this.props.endpointSelectionDialogVisible,
                    endpointSelectionDialogLocation: this.props.endpointSelectionDialogLocation,
                    onUpdateEndpoint: this.routePlannerAction.updateEndpoint,
                    onOpenEndpointSelectionDialog:
                        this.routePlannerAction.openEndpointSelectionDialog,
                    onCloseEndpointSelectionDialog:
                        this.routePlannerAction.closeEndpointSelectionDialog
                };
                view = React.createElement(RoutePlannerView, props);
                break;
            case ViewType.ELEVATION_CALCULATOR:
                view = React.createElement(ElevationCalculatorView);
                break;
            default:
                console.log("Unknown view:", this.props.view);
                view = null;
        }
        return view;
    },

    _updateContent: function (view) {
        this.containerAction.updateView(view);
    },

    componentWillMount: function () {
        this.containerAction = Redux.bindActionCreators(
            containerAction,
            this.props.dispatch
        );
        this.apiKeyAction = Redux.bindActionCreators(
            apiKeyAction,
            this.props.dispatch
        );
        this.routePlannerAction = Redux.bindActionCreators(
            routePlannerAction,
            this.props.dispatch
        );
        this.notificationAction = Redux.bindActionCreators(
            notificationAction,
            this.props.dispatch
        );

        // Needed for onTouchTap
        // http://stackoverflow.com/a/34015469/988941
        injectTapEventPlugin();
    },

    componentDidMount: function () {
        const params = queryString.parse(location.search);
        const apiKey = params["apiKey"];
        if (apiKey) {
            this.apiKeyAction.updateApiKey(apiKey);
        }
    },

    render: function () {
        return (
            <MuiThemeProvider muiTheme={getMuiTheme(lightBaseTheme)}>
                <div>
                    <NotificationPanel
                            notifications={this.props.notifications}
                            onDelete={this.notificationAction.deleteNotification}
                    />
                    <ApiKeyView
                            apiKey={this.props.currentApiKey}
                            isApiKeyValid={this.props.isApiKeyValid}
                            isApiKeySaved={this.props.isApiKeySaved}
                            isMapsApiLoaded={this.props.isMapsApiLoaded}
                            onChange={this.apiKeyAction.updateApiKey}
                            onLoadMap={this._loadMap}
                    />
                    <Tabs value={this.props.view} onChange={this._updateContent}>
                        <Tab label="Route Planner" value={ViewType.ROUTE_PLANNER} />
                        <Tab label="Elevation Calculator" value={ViewType.ELEVATION_CALCULATOR} />
                    </Tabs>
                    {this._buildContent()}
                </div>
            </MuiThemeProvider>
        );
    }
});

App = ReactRedux.connect(function (state) {
    return {
        view: state.container.view,

        currentApiKey: state.apiKey.currentApiKey,
        apiKey: state.apiKey.apiKey,
        isApiKeyValid: state.apiKey.isApiKeyValid,
        isApiKeySaved: state.apiKey.isApiKeySaved,
        isMapsApiLoaded: state.apiKey.isMapsApiLoaded,

        travelMode: state.route.travelMode,
        routeExists: state.route.routeExists,
        routes: state.route.routes,
        distance: state.route.distance,
        endpointSelectionDialogLocation: state.route.endpointSelectionDialogLocation,
        endpointSelectionDialogVisible: state.route.endpointSelectionDialogVisible,

        notifications: state.notification.notifications
    };
})(App);

ReactDOM.render(
    <ReactRedux.Provider store={store}>
        <App />
    </ReactRedux.Provider>
    ,
    document.getElementById("app")
);
