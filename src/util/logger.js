"use strict";

const keyMirror = require("fbjs/lib/keyMirror");
const Level = keyMirror({
    TRACE: null,
    DEBUG: null,
    INFO: null,
    WARN: null,
    ERROR: null,
});
module.exports.Level = Level;

const Logger = function (opts) {
    const componentName = opts.name;
    const level = opts.level || Level.INFO;

    const log = function () {
        // formatted timestamp translated to the browser's locale
        const now = new Date();
        const timestampSegment = (new Date(now - now.getTimezoneOffset() * 60000))
                .toISOString()
                .slice(0, -1)
                .replace("T", " ");

        // pad the log level with spaces to have a 5 char log string
        const logLevelSegment = `[${("     " + arguments[0]).slice(-5)}]`;

        const componentNameSegment = `[${componentName}]`;

        // the first arg is the log level, remove it
        const logArgs = Array.from(arguments);
        logArgs.splice(0, 1);

        // and log the whole enchilada
        console.log(timestampSegment, logLevelSegment, componentNameSegment, ...logArgs);
    }

    return {
        trace: function () {
            log(Level.TRACE, ...arguments);
        },
        debug: function () {
            log(Level.DEBUG, ...arguments);
        },
        info: function () {
            log(Level.INFO, ...arguments);
        },
        warn: function () {
            log(Level.WARN, ...arguments);
        },
        error: function () {
            log(Level.ERROR, ...arguments);
        }
    };
};
module.exports.logger = Logger;

module.exports.main = Logger({ level: Level.DEBUG, name: "App" });
module.exports.map = Logger({ level: Level.DEBUG, name: "Map" });
module.exports.notificationPanel = Logger({ level: Level.DEBUG, name: "NotificationPanel" });
module.exports.routePlanner = Logger({ level: Level.DEBUG, name: "RoutePlanner" });
module.exports.elevationCalculator = Logger({ level: Level.DEBUG, name: "ElevationCalculator" });

module.exports.elevationAction = Logger({ level: Level.DEBUG, name: "ElevationAction" });

module.exports.containerReducer = Logger({ level: Level.DEBUG, name: "ContainerReducer" });
module.exports.apiKeyReducer = Logger({ level: Level.DEBUG, name: "ApiKeyReducer" });
module.exports.elevationReducer = Logger({ level: Level.DEBUG, name: "ElevationReducer" });
module.exports.notificationReducer = Logger({ level: Level.DEBUG, name: "NotificationReducer" });
module.exports.routePlannerReducer = Logger({ level: Level.DEBUG, name: "RoutePlannerReducer" });

module.exports.mapsApiConversions = Logger({ level: Level.DEBUG, name: "MapsApiConversions" });
module.exports.routeModifiers = Logger({ level: Level.DEBUG, name: "RouteModifiers" });

