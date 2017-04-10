const Logger = require("logplease");
Logger.setLogLevel(Logger.LogLevels.DEBUG); // TODO set to INFO

const options = {
    showTimestamp: true,
    showLevel: true
};

module.exports.main = Logger.create("Main", options);
module.exports.map = Logger.create("Map", options);
module.exports.notificationPanel = Logger.create("NotificationPanel", options);
module.exports.routePlanner = Logger.create("RoutePlanner", options);
module.exports.elevationCalculator = Logger.create("ElevationCalculator", options);

module.exports.elevationAction = Logger.create("ElevationAction", options);

module.exports.containerReducer = Logger.create("ContainerReducer", options);
module.exports.elevationReducer = Logger.create("ElevationReducer", options);
module.exports.notificationReducer = Logger.create("NotificationReducer", options);
module.exports.routePlannerReducer = Logger.create("RoutePlannerReducer", options);

module.exports.mapsApiConversions = Logger.create("MapsApiConversions", options);
module.exports.routeModifiers = Logger.create("RouteModifiers", options);
