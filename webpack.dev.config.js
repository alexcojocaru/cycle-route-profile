var Path = require("path");

var HtmlWebpackPlugin = require("html-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    entry: {
        app: "./src/App.jsx"
    },
    output: {
        filename: "[name].js" // Template based on keys in entry above
    },
    devtool: "source-map",
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                include: [
                    Path.resolve(__dirname, "src")
                ],
                exclude: [
                    "node_modules"
                ],
                loaders: ["react-hot", "babel-loader"]
            },
            {
                test: /\.json$/,
                loaders: ["json-loader"]
            },
            // the main sass get compiled as separate bundles
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract(
                    "style-loader",
                    "css-loader?sourceMap!sass-loader"
                )
            },
            {
                test: /\.png$/,
                loader: "file-loader?name=images/[path][name].[ext]"
            },
            {
                test: /\.gif$/,
                loader: "file-loader?name=images/[path][name].[ext]"
            },
            {
                test: /\.jpe?g$/,
                loader: "file-loader?name=images/[path][name].[ext]"
            },
            {
                // the following doesn't work, for the request param is like "?-sa9xtz"
                // test: /\.svg(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                test: /\.svg(\?.*)?$/,
                loader: "file-loader?name=images/[name].[ext]"
            }
        ]
    },
    resolve: {
        // I can now require('file') instead of require('file.jsx')
        extensions: ["", ".js", ".json", ".jsx"],
        modulesDirectories: ["node_modules"]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.ejs", // Load a custom template
            inject: "body", // Inject all scripts into the body
            favicon: "./src/images/favicon.png"
        }),
        new ExtractTextPlugin("[name].css")
    ]
};
