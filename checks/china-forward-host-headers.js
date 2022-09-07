require("../typedefs");
const log = require("loglevel");
const {
  isChinaClusterConfig,
  getExportValue,
  getLineNumber,
  isAJob,
  getClusterType,
  escapeRegExp,
} = require("../util");

const checkMsg = "GDS China: Forward Host Headers Must Be ICP Licensed";

/**
 * GDS China is hosted in mainland china, and therefore can only use ICP licensed domains.
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function chinaForwardHostHeaders(deployment, context, inputs, httpGet) {
  /**
   * This check is really for a very specific subset of deployments.
   * Most deployments will be able to skip this check.
   */
  const clusterType = getClusterType(context);
  if (
    !isChinaClusterConfig(context) ||
    !deployment.ordersContents ||
    clusterType === "jobs" ||
    isAJob(deployment.ordersContents)
  ) {
    log.info(`${checkMsg} - Skipping ${deployment.serviceName}`);
    return [];
  }

  // Check for existence of FORWARD_HOST_HEADERS variable
  const forwardHostHeaderValue = getExportValue(
    deployment.ordersContents.join("\n"),
    "FORWARD_HOST_HEADERS"
  );
  if (!forwardHostHeaderValue) {
    log.info(
      `No Forward Host Headers Value Found - Skipping ${deployment.serviceName}`
    );
    return [];
  }
  log.info(`${checkMsg} - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];
  const problems = [];
  const allHeaders = forwardHostHeaderValue.split(",");
  for (const header of allHeaders) {
    let allowed = false;
    for (const domain of inputs.icpDomains) {
      const domainMatcher = new RegExp(escapeRegExp(domain));
      if (domainMatcher.test(header)) {
        allowed = true;
      }
    }

    if (!allowed) {
      problems.push(
        `**${header}** must match one of **${allHeaders.join(", ")}**`
      );
    }
  }

  if (problems.length > 0) {
    const exportRegex = /export FORWARD_HOST_HEADERS=/;
    const line = getLineNumber(deployment.ordersContents, exportRegex);
    results.push({
      title: checkMsg,
      line,
      level: "failure",
      path: deployment.ordersPath,
      problems,
    });
  }

  return results;
}

module.exports = chinaForwardHostHeaders;
