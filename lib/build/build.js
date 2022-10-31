const Service = require("../service/Service");

module.exports = function ({ config = "", customWebpackPath = "" }, opts, cmd) {
  const service = new Service("build", {
    config,
    customWebpackPath,
  });
  service.start();
};
