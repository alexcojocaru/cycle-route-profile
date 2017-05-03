const merge = require("webpack-merge");
const baseConfig = require("./webpack.base.config.js");

module.exports = merge(
    baseConfig(true),
    {
        output: {
            filename: "[name]-[hash:8].js", // Template based on keys in entry above
            pathInfo: true
        }
    }
);
