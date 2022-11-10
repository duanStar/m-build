const Service = require("../service/Service");

module.exports = function (
  { config = "", customWebpackPath = "", stopBuild },
  opts,
  cmd
) {
  process.env.NODE_ENV = "production";
  const service = new Service("build", {
    config,
    customWebpackPath,
    stopBuild,
  });
  service.build();
};
