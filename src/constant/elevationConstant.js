"use strict";

var keyMirror = require("fbjs/lib/keyMirror");

var FetchStatus = keyMirror({
    RUNNING: null,
    SUCCESS: null,
    ERROR: null
});
module.exports.FetchStatus = FetchStatus;
