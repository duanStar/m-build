const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

/**
 * 内置 plugin 生成 webpack 初始配置
 * @param {Object} api
 * @param {Object} params
 */
module.exports = function (api, params = {}) {
  const { chainWebpack } = api;
  const config = chainWebpack();
  const cwd = process.cwd();
  // mode
  config.mode("production");
  // entry
  if (params.entry) {
    const entry = params.entry;
    if (typeof entry === "string") {
      config.entry("index").add(path.resolve(cwd, entry)).end();
    } else {
      Object.keys(entry).forEach((key) => {
        if (Array.isArray(entry[key])) {
          entry[key].forEach((item) => {
            config.entry(key).add(path.resolve(cwd, item));
          });
        } else {
          config.entry(key).add(path.resolve(cwd, entry[key])).end();
        }
      });
    }
  } else {
    config.entry("index").add(path.resolve(cwd, "./src/index.js")).end();
  }
  // output
  if (params.output) {
    config.output
      .filename(params.output.filename)
      .path(path.resolve(cwd, params.output.path));
  } else {
    config.output
      .filename("js/[name].[contenthash:6].js")
      .path(path.resolve(cwd, "./dist"));
  }
  // rule
  config.module
    .rule("css")
    .test(/\.css$/)
    .exclude.add(/node_modules/)
    .end()
    .use("mini-css")
    .loader(MiniCssExtractPlugin.loader)
    .end()
    .use("css-loader")
    .loader("css-loader");
  config.module
    .rule("asset")
    .test(/\.(png|svg|jp[e]?g|gif)$/i)
    .type("asset")
    .parser({
      dataUrlCondition: {
        maxSize: 8 * 1024,
      },
    });
  config.module.rule("asset").set("generator", {
    filename: "images/[name].[contenthash:6][ext]",
  });
  // plugin
  config.plugin("MiniCssExtractPlugin").use(MiniCssExtractPlugin, [
    {
      filename: "css/[name].[contenthash:6].css",
      chunkFilename: "css/[name].chunk.css",
    },
  ]);
  config.plugin("HTMLWebpackPlugin").use(HTMLWebpackPlugin, [
    {
      template: path.resolve(cwd, "./public/index.html"),
      filename: "index.html",
      chunks: ["index"],
    },
  ]);
  config.plugin("CleanWebpackPlugin").use(CleanWebpackPlugin, []);
  // optimization
  config.optimization
    .concatenateModules(true)
    .minimize(true)
    .usedExports(true)
    .splitChunks({
      chunks: "all",
      minSize: 5 * 1024,
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          priority: 20,
          minChunks: 1,
        },
        common: {
          priority: 10,
          minChunks: 2,
        },
      },
    });
  config.optimization
    .minimizer("CssMinimizerPlugin")
    .use(CssMinimizerPlugin, []);
  // devtool
  config.devtool("nosources-source-map");
};
