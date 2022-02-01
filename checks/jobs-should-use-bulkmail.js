require("../typedefs");
const log = require("loglevel");
const { suggest, isAJob, parseEnvVar } = require("../util");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function jobsShouldUseBulkMail(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  if (!isAJob(deployment.ordersContents)) {
    log.info(`Not A Job - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Jobs Should Use Bulkmail - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;

    const { value } = parseEnvVar(line);
    if (value && /email-internal\.glgresearch\.com/.test(value)) {
      results.push({
        title: "Jobs Should Use The Bulk Mail Server",
        level: "failure",
        line: lineNumber,
        path: deployment.ordersPath,
        problems: [
          suggest(
            "Use bulkmail-internal",
            line.replace("email-internal", "bulkmail-internal")
          ),
        ],
      });
    }
  });

  return results;
}

module.exports = jobsShouldUseBulkMail;
