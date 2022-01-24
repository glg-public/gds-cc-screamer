require("../typedefs");
const log = require("loglevel");
//TODO: why doesnt this work?
// const { getClusterType } = require("../util/generic");
const { getExportValue } = require("../util/generic");

/**
 * Rejects orders that export a duplicate forward host header value
 * TODO: some of these may be able to be removed!
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */

// The main function that runs
async function noDuplicateForwardHostHeaders(deployment, context, inputs, httpGet) {

  //TODO: why doesnt this work?
  // const clusterType = getClusterType(context);
  // if (clusterType === "jobs") {
  //   log.info(`Jobs Cluster - Skipping Check: Max Services Per Cluster`);
  //   return [];
  // }

  // Check the existence of orders file
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  // Check for existence of FORWARD_HOST_HEADERS variable
  const forwardHostHeaderValue = getExportValue(
    deployment.ordersContents.join("\n"),
    "FORWARD_HOST_HEADERS"
  );
  if (!forwardHostHeaderValue) {
    log.info(`No Forward Host Headers Value Found - Skipping ${deployment.serviceName}`);
    return [];
  }

  // Inform people we are now at the meat of what check we are running
  log.info(`No Duplicate Forward Host Headers - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;
    // do something
  });

  return results;
}

module.exports = noDuplicateForwardHostHeaders;
