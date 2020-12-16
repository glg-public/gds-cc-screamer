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
  core.info(`Template Check - ${deployment.path}`);
  const results = [];
  /**
   * A Result Object:
   {
    title: 'Failing Check',
    problems: ['This code sucks'],
    line: lineNumber,
    level: 'failure' // must be "failure", "warning", "notice", or "success"
    [path]: deployment.secretsPath // This defaults to the deployment path, but you can override for different files.
   }
   */

  deployment.contents.forEach((line, i) => {
    const lineNumber = i + 1;
    // do something
  });

  return results;
}

module.exports = templateCheck;
