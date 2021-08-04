require("../typedefs");
const log = require("loglevel");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function restrictedBuckets(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.policyJson) {
    log.info(
      `Missing or invalid policy.json - Skipping ${deployment.serviceName}`
    );
    return [];
  }
  log.info(`No Restricted Buckets - ${deployment.policyJsonPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.policyJson.Statement.forEach((statement) => {});

  return results;
}

module.exports = restrictedBuckets;
