const semver = require("semver");
const process = require("process");

/**
 * 判断当前 node 环境是否匹配
 * @param {String} minNodeVersion
 * @returns {Boolean}
 */
function checkNode(minNodeVersion) {
  return semver.gt(
    semver.valid(semver.coerce(process.version)),
    minNodeVersion
  );
}

module.exports = checkNode;
