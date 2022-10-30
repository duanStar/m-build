const path = require("path");
const webpackChain = require("webpack-chain");
const fs = require("fs");
const log = require("../utils/log");
const { getConfigFile, loadModule } = require("../utils");
const { hooks } = require("./const");
const initPlugin = require("../../plugins/initPlugin");

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
    this.plugins = [];
    this.webpackConfig = new webpackChain();
    this.dir = process.cwd();
    // 插件通信的值
    this.internalValue = {};
  }

  async start() {
    await this.resolveConfig();
    await this.registerHooks();
    this.emitHooks(hooks.HOOK_START);
    await this.registerPlugin();
    await this.runPlugin();
    await this.initWebpack();
    // TODO 完成 webpack 配置
    // TODO webpack-dev-server 启动
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

  /**
   * 注册插件
   */
  async registerPlugin() {
    log.verbose("pluginConfig", this.config && this.config.plugins);
    let { plugins } = this.config;
    const buildInPlugins = [initPlugin];
    buildInPlugins.forEach((plugin) => {
      this.plugins.push({
        mod: plugin,
      });
    });
    if (plugins) {
      if (typeof plugins === "function") {
        plugins = plugins();
      }
      if (Array.isArray(plugins)) {
        for (let plugin of plugins) {
          if (typeof plugin === "string") {
            const mod = await loadModule(plugin);
            this.plugins.push({ mod });
          } else if (Array.isArray(plugin)) {
            const [pluginPath, pluginParams] = plugin;
            const mod = await loadModule(pluginPath);
            this.plugins.push({
              mod,
              param: pluginParams,
            });
          } else if (typeof plugin === "function") {
            this.plugins.push({
              mod: plugin,
            });
          }
        }
      }
    }
    log.verbose("plugins", this.plugins);
  }

  /**
   * 运行插件
   */
  async runPlugin() {
    const API = {
      chainWebpack: this.getWebpackConfig.bind(this),
      emitHooks: this.emitHooks.bind(this),
      getValue: this.getValue.bind(this),
      setValue: this.setValue.bind(this),
      log,
    };

    for (const plugin of this.plugins) {
      const { mod, param } = plugin;
      if (!mod) {
        continue;
      }
      const options = {
        ...param,
      };
      await mod(API, options);
    }
  }

  /**
   * 初始化webpack
   */
  initWebpack = async () => {
    let { customWebpackPath } = this.params;
    if (customWebpackPath && fs.existsSync(customWebpackPath)) {
      if (!path.isAbsolute(customWebpackPath)) {
        customWebpackPath = path.resolve(customWebpackPath);
      }
      this.webpack = require.resolve(customWebpackPath);
    } else {
      this.webpack = require.resolve("webpack", {
        paths: [path.resolve(this.dir, "node_modules")],
      });
    }
  };

  getWebpackConfig() {
    return this.webpackConfig;
  }

  setValue(key, value) {
    this.internalValue[key] = value;
  }

  getValue(key) {
    return this.internalValue[key];
  }
}

module.exports = Service;
