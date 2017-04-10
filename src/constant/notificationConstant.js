"use strict";

var keyMirror = require("fbjs/lib/keyMirror");

var Level = keyMirror({
    ERROR: null,
    SUCCESS: null,
    WARNING: null,
    INFO: null
});
module.exports.Level = Level;
