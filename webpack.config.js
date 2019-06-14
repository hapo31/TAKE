const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const path = require("path");
const isDev = process.env.NODE_ENV !== "production";

const outputPath = path.join(__dirname, "dist");

var main = {
  mode: isDev ? "development" : "production",
  target: "electron-main",
  devtool: isDev ? "source-map" : false,
  entry: path.join(__dirname, "src", "index"),
  output: {
    filename: "index.js",
    path: outputPath
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
    // Module not found: Error: Can't resolve './lib-cov/fluent-ffmpeg' が出るのを防ぐ
    new webpack.DefinePlugin({
      "process.env.FLUENTFFMPEG_COV": false
    }),
    new CopyWebpackPlugin([
      {
        from: path.join(__dirname, "src", "renderer", "index.html")
      },
      {
        from: path.join(__dirname, "images/**/*")
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
    path: path.resolve(outputPath, "scripts")
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
  },
  plugins: [
    // Module not found: Error: Can't resolve './lib-cov/fluent-ffmpeg' が出るのを防ぐ
    new webpack.DefinePlugin({
      "process.env.FLUENTFFMPEG_COV": false
    })
  ]
};

// var worker = {
//   mode: isDev ? "development" : "production",
//   target: "electron-renderer",
//   entry: path.join(__dirname, "src", "renderer", "WebWorker", "index"),
//   devtool: isDev ? "inline-source-map" : false,
//   output: {
//     filename: "worker.js",
//     path: path.resolve(outputPath, "scripts")
//   },
//   resolve: {
//     extensions: [".json", ".js", ".ts"]
//   },
//   module: {
//     rules: [
//       {
//         test: /\.ts/,
//         use: ["ts-loader"],
//         include: [
//           path.resolve(__dirname, "src"),
//           path.resolve(__dirname, "node_modules")
//         ]
//       }
//     ]
//   },
//   plugins: [
//     // Module not found: Error: Can't resolve './lib-cov/fluent-ffmpeg' が出るのを防ぐ
//     new webpack.DefinePlugin({
//       "process.env.FLUENTFFMPEG_COV": false
//     }),
//     new CopyWebpackPlugin([
//       // {
//       //   from: path.join(__dirname, "node_modules", "jsgif", "GIFEncoder.js")
//       // },
//       // {
//       //   from: path.join(__dirname, "node_modules", "jsgif", "LZWEncoder.js")
//       // },
//       // {
//       //   from: path.join(__dirname, "node_modules", "jsgif", "NeuQuant.js")
//       // },
//       // {
//       //   from: path.join(__dirname, "node_modules", "jsgif", "b64.js")
//       // }
//     ])
//   ]
// };

module.exports = [main, renderer];
