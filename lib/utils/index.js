const DEFAULT_CONFIG_FILE = "m.config.(json|js|mjs)";
const fg = require("fast-glob");
const path = require("path");
const fs = require("fs");
const log = require("../utils/log");

/**
 * 查找配置文件路径
 * @param {String} cwd
 * @returns {String}
 */
function getConfigFile(cwd = process.cwd()) {
  const files = fg.sync(DEFAULT_CONFIG_FILE, {
    cwd,
    absolute: true,
  });
  log.verbose("CONFIG FILE", files[0]);
  return files[0];
}

/**
 * 判断系统是否是win
 * @returns {Boolean}
 */
function isWin() {
  return process.platform === "win32";
}

/**
 * 加载模块
 * @param {String} modulePath
 */
async function loadModule(modulePath) {
  if (!modulePath) {
    return null;
  }
  // 判断路径还是模块
  if (modulePath.startsWith("/") || modulePath.startsWith(".")) {
    modulePath = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(modulePath);
  } else {
    modulePath = require.resolve(modulePath, {
      paths: [path.resolve(process.cwd(), "node_modules")],
    });
  }

  if (fs.existsSync(modulePath)) {
    let result;
    // 读取配置文件，处理 esm
    const isMjs = modulePath.endsWith("mjs");
    try {
      if (isMjs) {
        if (isWin()) {
          modulePath = "file:\\\\" + modulePath;
        }
        result = (await import(modulePath)).default;
      } else {
        result = require(modulePath);
      }
      return result;
    } catch (err) {
      log.error("load", `加载 ${modulePath} 失败`);
      return null;
    }
  }
  return null;
}

module.exports = {
  getConfigFile,
  loadModule,
};
