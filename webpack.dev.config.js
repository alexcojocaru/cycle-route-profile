var Path = require("path");

var HtmlWebpackPlugin = require("html-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var extractCSS = new ExtractTextPlugin("stylesheets/[name]-[contenthash:8].css");

module.exports = {
    entry: {
        app: "./src/App.jsx"
    },
    output: {
        filename: "[name]-[hash:8].js" // Template based on keys in entry above
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
            {
                test: /\.scss$/,
                loader: extractCSS.extract(
                    "style-loader",
                    "css-loader?sourceMap!sass-loader"
                )
            },
            {
                test: /\.css$/,
                loader: extractCSS.extract(
                    "style-loader",
                    "css-loader?sourceMap"
                )
            },
            {
                test: /\.png$/,
                loader: "file-loader?name=images/[path][name]-[hash:8].[ext]"
            },
            {
                test: /\.gif$/,
                loader: "file-loader?name=images/[path][name]-[hash:8].[ext]"
            },
            {
                test: /\.jpe?g$/,
                loader: "file-loader?name=images/[path][name]-[hash:8].[ext]"
            },
            {
                // the following doesn't work, for the request param is like "?-sa9xtz"
                // test: /\.svg(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                test: /\.svg(\?.*)?$/,
                loader: "file-loader?name=images/[path][name]-[hash:8].[ext]"
            }
        ]
    },
    resolve: {
        // I can now require("file") instead of require("file.jsx")
        extensions: ["", ".js", ".json", ".jsx"],
        modulesDirectories: ["node_modules"]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.ejs", // Load a custom template
            inject: "body", // Inject all scripts into the body
            favicon: "./src/images/favicon.png"
        }),
        extractCSS
    ]
};
