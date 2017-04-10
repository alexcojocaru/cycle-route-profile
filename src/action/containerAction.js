"use strict";

var keyMirror = require("fbjs/lib/keyMirror");


var Types = keyMirror({
    UPDATE_VIEW: null
});
module.exports.Types = Types;

module.exports.updateView = function (view) {
    return {
        type: Types.UPDATE_VIEW,
        value: view
    };
};

