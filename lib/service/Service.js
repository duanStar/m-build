const path = require("path");
const webpackChain = require("webpack-chain");
const fs = require("fs");
const webpackDevServer = require("webpack-dev-server");
const log = require("../utils/log");
const { getConfigFile, loadModule } = require("../utils");
const { hooks } = require("./const");
const initDevPlugin = require("../../plugins/initDevPlugin");
const initBuildPlugin = require("../../plugins/initBuildPlugin");

// 过滤非法的hooks
const HOOK_KEYS = Object.values(hooks);

/**
 * 打包服务类
 */
class Service {
  constructor(cmd, params) {
    this.cmd = cmd;
    this.params = params;
    this.config = {};
    this.hooks = {};
    this.plugins = [];
    this.webpackConfig = new webpackChain();
    this.dir = process.cwd();
    // 插件通信的值
    this.internalValue = {};
  }

  /**
   * 构建
   */
  async build() {
    await this.resolveConfig();
    await this.registerHooks();
    this.emitHooks(hooks.HOOK_START);
    await this.registerPlugin();
    await this.runPlugin();
    if (!this.params.stopBuild) {
      await this.initWebpack();
      log.verbose("WEBPACK CONFIG", this.webpackConfig.toConfig());
      await this.startBuild();
    }
  }

  async start() {
    await this.resolveConfig();
    await this.registerHooks();
    this.emitHooks(hooks.HOOK_START);
    await this.registerPlugin();
    await this.runPlugin();
    if (!this.params.stopBuild) {
      await this.initWebpack();
      log.verbose("WEBPACK CONFIG", this.webpackConfig.toConfig());
      await this.startServer();
    }
  }
  /**
   * 启动 webpack 服务
   */
  async startServer() {
    let compiler, devServer;
    try {
      const webpack = require(this.webpack);
      const webpackConfig = this.webpackConfig.toConfig();
      compiler = webpack(webpackConfig, (err, stats) => {
        if (err) {
          log.error("ERROR", err);
          process.exit(1);
        } else {
          const res = stats.toJson({
            all: false,
            errors: true,
            warnings: true,
            timings: true,
          });
          if (res.errors && res.errors.length) {
            res.errors.forEach((error) => {
              log.error("ERROR MESSAGE", error.message);
              error.stack && log.error("ERROR STACK", error.stack);
            });
          } else if (res.warnings && res.warnings.length) {
            res.warnings.forEach((error) => {
              log.warn("WARNING MESSAGE", error.message);
            });
          } else {
            log.info(
              "COMPILE SUCCESS",
              "compile finished in " + res.time / 1000 + "s"
            );
          }
        }
      });
      const serverConfig = {
        port: this.params.port || 8080,
        host: this.params.host || "0.0.0.0",
        https: this.params.https || false,
      };
      if (webpackDevServer.getFreePort) {
        devServer = new webpackDevServer(serverConfig, compiler);
      } else {
        devServer = new webpackDevServer(compiler, serverConfig);
      }
      if (devServer.startCallback) {
        devServer.startCallback((err) => {
          if (err) {
            log.error("ERROR", "webpack-dev-server error");
            log.error("ERROR MESSAGE", err.message);
          } else {
            log.info("SUCCESS", "webpack-dev-server start successfully!!");
          }
        });
      } else {
        devServer.listen(serverConfig.port, serverConfig.host, (err) => {
          if (err) {
            log.error("ERROR", "webpack-dev-server error");
            log.error("ERROR MESSAGE", err.message);
          } else {
            log.info("SUCCESS", "webpack-dev-server start successfully!!");
          }
        });
      }
    } catch (err) {
      log.error("COMPILE", err);
    }
  }
  /**
   * 开始 build
   */
  async startBuild() {
    let compiler;
    try {
      const webpack = require(this.webpack);
      const webpackConfig = this.webpackConfig.toConfig();
      compiler = webpack(webpackConfig, (err, stats) => {
        if (err) {
          log.error("ERROR", err);
          process.exit(1);
        } else {
          const res = stats.toJson({
            all: false,
            errors: true,
            warnings: true,
            timings: true,
          });
          if (res.errors && res.errors.length) {
            res.errors.forEach((error) => {
              log.error("ERROR MESSAGE", error.message);
              error.stack && log.error("ERROR STACK", error.stack);
            });
          } else if (res.warnings && res.warnings.length) {
            res.warnings.forEach((error) => {
              log.warn("WARNING MESSAGE", error.message);
            });
          } else {
            log.info(
              "BUILD SUCCESS",
              "build finished in " + res.time / 1000 + "s"
            );
          }
          process.exit(0);
        }
      });
    } catch (err) {
      log.error("COMPILE", err);
    }
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
      log.error("CONFIG", "配置文件不存在");
      process.exit(1);
    }
  }
  /**
   * 注册hooks
   */
  async registerHooks() {
    log.verbose("HOOKS CONFIG", this.config && this.config.hooks);
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
    log.verbose("HOOKS", this.hooks);
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
          log.error(`HOOK ${key.toUpperCase()}`, err);
        }
      }
    }
  }

  /**
   * 注册插件
   */
  async registerPlugin() {
    log.verbose("PLUGIN CONFIG", this.config && this.config.plugins);
    let { plugins } = this.config;
    const buildInPlugins =
      this.cmd === "start" ? [initDevPlugin] : [initBuildPlugin];
    buildInPlugins.forEach((plugin) => {
      this.plugins.push({
        mod: plugin,
        param: this.config,
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
    log.verbose("PLUGINS", this.plugins);
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
  async initWebpack() {
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
  }

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
