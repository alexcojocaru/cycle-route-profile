const Path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = function (dev) {
    const extractCSS = new ExtractTextPlugin(
        `stylesheets/[name]-[contenthash:8]${dev ? "" : ".min"}.css`
    );

    const jsxLoaders = ["babel-loader"];
    if (dev) {
        jsxLoaders.splice(0, 0, "react-hot");
    }

    return {
        entry: {
            app: "./src/App.jsx"
        },
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
                    loaders: jsxLoaders
                },
                {
                    test: /\.jsx?$/,
                    include: [
                        Path.resolve(__dirname, "src")
                    ],
                    exclude: [
                        "node_modules"
                    ],
                    loader: "babel-loader"
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
};
