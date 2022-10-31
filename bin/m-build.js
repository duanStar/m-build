#!/usr/bin/env node
// 需要提前执行,避免 log 等级不同步
checkDebug();
const commander = require("commander");
const pkg = require("../package.json");
const checkNode = require("../lib/utils/checkNode");
const startServer = require("../lib/start/startServer");
const build = require("../lib/build/build");
const { program } = commander;

/**
 * 判断是否处于 debug 模式
 * 是则更新 log 的等级为 `verbose`
 */
function checkDebug() {
  if (process.argv.indexOf("--debug") >= 0 || process.argv.indexOf("-d") >= 0) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }
}

const MIN_NODE_VERSION = "8.9.0";
(async () => {
  try {
    if (!checkNode(MIN_NODE_VERSION)) {
      throw new Error(
        "Please upgrade your node version to v" + MIN_NODE_VERSION
      );
    }
    // 注册命令
    program.name("m-build").version(pkg.version);
    // 注册 start 命令
    program
      .command("start")
      .option("-c --config <config>", "配置文件路径")
      .option("-p --port <port>", "服务启动所监听端口号")
      .option("--custom-webpack-path <customWebpackPath>", "自定义webpack路径")
      .description("start m-build server")
      .allowUnknownOption()
      .action(startServer);
    // 注册 build 命令
    program
      .command("build")
      .option("-c --config <config>", "配置文件路径")
      .option("--custom-webpack-path <customWebpackPath>", "自定义webpack路径")
      .description("build project by m-build")
      .allowUnknownOption()
      .action(build);

    program.option("-d --debug", "开启调试模式");
    // 开始解析
    program.parse(process.argv);
  } catch (err) {
    console.log(err.message);
  }
})();
