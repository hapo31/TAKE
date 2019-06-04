const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const isDev = process.env.NODE_ENV !== "production";

var main = {
  mode: isDev ? "development" : "production",
  target: "electron-main",
  devtool: isDev ? "source-map" : false,
  entry: path.join(__dirname, "src", "index"),
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist")
  },
  node: {
    __dirname: false,
    __filename: false
  },
  module: {
    rules: [
      {
        test: /.ts?$/,
        include: [path.resolve(__dirname, "src")],
        exclude: [path.resolve(__dirname, "node_modules")],
        loader: "ts-loader"
      }
    ]
  },
  resolve: {
    extensions: [".js", ".ts"]
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: path.join(__dirname, "src", "renderer", "index.html")
      }
    ])
  ]
};

var renderer = {
  mode: isDev ? "development" : "production",
  target: "electron-renderer",
  entry: path.join(__dirname, "src", "renderer", "index"),
  devtool: isDev ? "inline-source-map" : false,
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist", "scripts")
  },
  resolve: {
    extensions: [".json", ".js", ".jsx", ".css", ".ts", ".tsx"]
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts)$/,
        use: ["ts-loader"],
        include: [
          path.resolve(__dirname, "src"),
          path.resolve(__dirname, "node_modules")
        ]
      }
    ]
  }
};

module.exports = [main, renderer];
