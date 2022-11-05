const chokidar = require("chokidar");
const path = require("path");
const cp = require("child_process");
const fs = require("fs");
const { getConfigFile } = require("../utils");
const log = require("../utils/log");
let child;

/**
 * 创建子进程,启动服务
 * @param {String} config
 * @param {Number} port
 */
function runServer(config, port, customWebpackPath, stopBuild) {
  // 启动webpack服务
  const scriptPath = path.resolve(__dirname, "./devService.js");
  // 启动子进程,传递参数
  child = cp.fork(scriptPath, [
    `--port ${port}`,
    `--config ${config}`,
    `--customWebpackPath ${customWebpackPath}`,
    `--stopBuild ${stopBuild}`,
  ]);
  child.on("message", (data) => {
    console.log(data);
  });
  child.on("exit", (code) => {
    if (code) {
      process.exit(code);
    }
  });
}

/**
 * 文件修改回调
 * @param {String} config
 * @param {Number} port
 * @returns {Function}
 */
function onChange(config, port) {
  return function (eventName, path, stats) {
    log.info("ONCHANGE", "config file is changed!");
    // 重启服务
    child.kill();
    child = null;
    runServer(config, port);
  };
}

/**
 * 启动配置文件监听服务
 * @param {String} config
 * @param {Number} port
 */
function runWatcher(config, port) {
  // 启动配置监听服务
  let configPath = config || getConfigFile();
  if (!path.isAbsolute(configPath)) {
    configPath = path.resolve(configPath);
  }
  if (!fs.existsSync(configPath)) {
    log.error("config", "配置文件不存在");
    process.exit(1);
  }
  const watcher = chokidar.watch(configPath);
  watcher.on("change", onChange(config, port));
  watcher.on("error", (err) => {
    console.error("file watch error" + err);
    watcher.close();
    process.exit(1);
  });
}

module.exports = function (
  { config = "", port, customWebpackPath = "", stopBuild = false },
  opts,
  cmd
) {
  // 1. 通过子进程启动服务
  // 1.1 子进程可以避免主进程受到干扰
  // 1.2 子进程可以方便重启，解决配置修改后无法重启
  runServer(config, port, customWebpackPath, stopBuild);
  // 2.监听配置修改
  runWatcher(config, port);
};
