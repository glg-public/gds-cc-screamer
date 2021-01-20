require('../typedefs');
const core = require("@actions/core");

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
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`Template Check - ${deployment.ordersPath}`);
  const results = [];
  /**
   * A Result Object:
   {
    title: 'Failing Check',
    problems: ['This code sucks'],
    line: lineNumber,
    level: 'failure' // must be "failure", "warning", "notice", or "success"
    [path]: deployment.secretsJsonPath // This defaults to the deployment path, but you can override for different files.
   }
   */

  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;
    // do something
  });

  return results;
}

module.exports = templateCheck;
