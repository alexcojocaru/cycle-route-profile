const Clean = require("clean-webpack-plugin");
const UglifyJsPlugin = require("webpack").optimize.UglifyJsPlugin;
const DedupePlugin = require("webpack").optimize.DedupePlugin;

const merge = require("webpack-merge");
const baseConfig = require("./webpack.base.config.js");

const buildDir = "build";


module.exports = merge(
    baseConfig(false),
    {
        output: {
            path: `./${buildDir}`,
            filename: "[name]-[hash:8].min.js", // Template based on keys in entry above
            pathInfo: false
        },
        module: {
            preLoaders: [{
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: "eslint-loader"
            }]
        },
        plugins: [
            new Clean([buildDir]),
            new DedupePlugin(),
            new UglifyJsPlugin({ minimize: true, output: { comments: false } })
        ]
    }
);
