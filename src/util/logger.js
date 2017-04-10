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

const LoggerConfig = {
    root: Level.DEBUG
    // define levels for specific component names as needed
};

const Logger = function (name) {
    const componentName = name || "N/A";
    const level = LoggerConfig[componentName] || LoggerConfig.root || Level.INFO;

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

