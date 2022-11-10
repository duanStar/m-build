# m-build
Build CLI

# Options
```shell
Usage: m-build [options] [command]

Options:
  -V, --version    output the version number
  -d --debug       开启调试模式
  -h, --help       display help for command

Commands:
  start [options]  start m-build server
  build [options]  build project by m-build
  help [command]   display help for command
```

## start
```shell
Usage: m-build start [options]

start m-build server

Options:
  -c --config <config>                       配置文件路径
  -p --port <port>                           服务启动所监听端口号
  --stop-build                               停止启动服务
  --custom-webpack-path <customWebpackPath>  自定义webpack路径
  -h, --help                                 display help for command
  ```
  
  ## build
  ```shell
Usage: m-build build [options]

build project by m-build

Options:
  -c --config <config>                       配置文件路径
  --custom-webpack-path <customWebpackPath>  自定义webpack路径
  --stop-build                               停止构建
  -h, --help                                 display help for command
  ```
  
  # Config
  - m.config.json
  - m.config.js
  - m.config.mjs
  
  ## Sample
  
  ```js
  // m.config.js
  module.exports = {
  entry: {
    index: ["./src/index.js"],
  },
  output: {
    filename: "js/[name].js",
    path: "./dist",
  },
  plugins: [
    function (api, params) {
      const { chainWebpack } = api;
      const config = chainWebpack();
      // config.plugins/entry/....
      // 参考 webpack-chain
    },
    ['./plugins/htmlPlugin', {template: './public/index.html'}]
  ],
  hooks: [
    [
      "start",
      function (context) {
        console.log("start");
      },
    ],
  ],
};
```
