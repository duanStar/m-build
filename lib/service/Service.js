const path = require("path");
const fs = require("fs");
const log = require("../utils/log");
const { getConfigFile, loadModule } = require("../utils");
const { hooks } = require("./const");

// 过滤非法的hooks
const HOOK_KEYS = Object.values(hooks);

/**
 * 打包服务类
 */
class Service {
  constructor(params) {
    this.params = params;
    this.config = {};
    this.hooks = {};
    this.dir = process.cwd();
  }

  async start() {
    await this.resolveConfig();
    await this.registerHooks();
    this.emitHooks(hooks.HOOK_START);
  }
  /**
   * 解析配置
   * 多配置文件解析
   */
  async resolveConfig() {
    const { config } = this.params;
    let configPath = "";
    // 用户指定了配置文件路径
    if (config) {
      if (path.isAbsolute(config)) {
        configPath = config;
      } else {
        configPath = path.resolve(config);
      }
    } else {
      // 否则主动查找
      configPath = getConfigFile(this.dir);
    }
    this.config = await loadModule(configPath);
    if (!this.config) {
      log.error("config", "配置文件不存在");
      process.exit(1);
    }
  }
  /**
   * 注册hooks
   */
  async registerHooks() {
    log.verbose("hooksConfig", this.config && this.config.hooks);
    const { hooks } = this.config;
    if (hooks && hooks.length) {
      for (let hook of hooks) {
        const [key, fn] = hook;
        if (key && fn && typeof key === "string" && HOOK_KEYS.includes(key)) {
          if (typeof fn === "function") {
            const existHook = this.hooks[key];
            if (!existHook) {
              this.hooks[key] = [];
            }
            this.hooks[key].push(fn);
          } else if (typeof fn === "string") {
            const callback = await loadModule(fn);
            if (callback) {
              const existHook = this.hooks[key];
              if (!existHook) {
                this.hooks[key] = [];
              }
              this.hooks[key].push(callback);
            }
          }
        }
      }
    }
    log.verbose("hooks", this.hooks);
  }
  /**
   * 触发 hooks
   * @param {String} key
   */
  async emitHooks(key) {
    const hooks = this.hooks[key];
    if (hooks) {
      for (let fn of hooks) {
        try {
          await fn(this);
        } catch (err) {
          log.error(`hook-${key}`, err);
        }
      }
    }
  }
}

module.exports = Service;
