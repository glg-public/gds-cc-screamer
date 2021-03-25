require("../typedefs");
const log = require("loglevel");
const { getExportValue, suggest } = require("../util");

/**
 * Requires the use of | instead of + to combine jwt access flags
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function jwtAccessFlags(deployment) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`JWT Access Flags - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];
    const jwtFlags = getExportValue(line, "JWT_ACCESS_FLAGS");
    const sessionFlags = getExportValue(line, "SESSION_ACCESS_FLAGS");
    const accessFlags = sessionFlags || jwtFlags;
    if (accessFlags && accessFlags.includes("+")) {
      results.push({
        title: `Syntax Error in ${
          sessionFlags ? "SESSION" : "JWT"
        }_ACCESS_FLAGS`,
        problems: [suggest("Use a `|` instead", line.replace(/\+/g, "|"))],
        line: i + 1,
        level: "failure",
      });
    }
  }

  return results;
}

module.exports = jwtAccessFlags;
