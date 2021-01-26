require('../typedefs');
const core = require("@actions/core");
const { getExportValue, suggest } = require('../util');

/**
 * Requires the use of | instead of + to combine jwt access flags
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function jwtAccessFlags(deployment) {
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`JWT Access Flags - ${deployment.ordersPath}`);
  const results = [];

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];
    const accessFlags = getExportValue(line, "JWT_ACCESS_FLAGS");
    if (accessFlags && accessFlags.includes("+")) {
      results.push({
        title: "Syntax Error in JWT_ACCESS_FLAGS",
        problems: [suggest("Use a `|` instead", line.replace(/\+/g, "|"))],
        line: i + 1,
        level: "failure",
      });
    }
  }

  return results;
}

module.exports = jwtAccessFlags;
