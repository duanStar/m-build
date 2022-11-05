const detectPort = require("detect-port");
const inquirer = require("inquirer");
const Service = require("../service/Service");
const log = require("../utils/log");

(async function () {
  const DEFAULT_PORT = 8080;
  const paramsObj = {};
  const params = process.argv.slice(2);
  params.forEach((item) => {
    const paramArr = item.split(" ");
    paramsObj[paramArr[0].replace(/^[-]*/, "")] = paramArr[1];
  });

  const defaultPort = parseInt(paramsObj.port || DEFAULT_PORT);
  try {
    // 检测端口是否被占用
    const newPort = await detectPort(defaultPort);
    if (newPort === defaultPort) {
      log.info("PORT", `端口号 ${defaultPort} 可以使用`);
    } else {
      // 端口被占用
      const questions = {
        type: "confirm",
        name: "answer",
        message: `端口号 :${defaultPort} 已被占用，是否启用新端口 :${newPort}?`,
      };
      const { answer } = await inquirer.prompt(questions);
      if (!answer) {
        process.exit(1);
      }
    }
    process.env.NODE_ENV = "development";
    // 启动服务
    const service = new Service("start", {
      port: newPort,
      config: paramsObj.config || "",
      customWebpackPath: paramsObj.customWebpackPath || "",
      stopBuild: paramsObj.stopBuild === "true" || false,
    });
    service.start();
  } catch (err) {
    console.log(err);
  }
})();
