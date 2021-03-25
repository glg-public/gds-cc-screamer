require("../typedefs");
const log = require("loglevel");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function templateCheck(deployment, context, inputs) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Template Check - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;
    // do something
  });

  return results;
}

module.exports = templateCheck;
