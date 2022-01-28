require("../typedefs");
const log = require("loglevel");
const path = require("path");
const fs = require("fs").promises;
const { isAJob, getClusterType, getExportValue, getLineNumber } = require("../util");

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

  // Check the existence of orders file
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  // Check if this is a jobs cluster
  const clusterType = getClusterType(context);
  if ( clusterType === "jobs" || isAJob(deployment.ordersContents) ) {
    log.info('Jobs Cluster - Skipping Check: No Duplicate Forward Host Headers');
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
  log.info(`Running Check: No Duplicate Forward Host Headers - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  // split the list of domain names in the variable by the , that separates them
  const forwardHostHeaderValueSplit = forwardHostHeaderValue.split(",");

  // the root path that will be used later to walk the tree
  const { clusterRoot } = inputs;

  // grab any existing forwardHostHeader values that already exist
  const otherForwardHostHeaderValues = await getOtherHostHeaderValuesFromCluster(clusterRoot);

  // Determine if there are any duplicates coming in from the new orders file
  const output = await otherForwardHostHeaderValues.filter(obj => forwardHostHeaderValueSplit.includes(obj.host));

  // the output from above occasionally comes back in another order than the test expects. This will order them alphabetically and fix tests.
  output.sort((a, b) => a.host.toLowerCase().localeCompare(b.host.toLowerCase()));

  if ( output.length > 0 ) {
    return [
      {
        title: "Duplicate host header value",
        problems: [
          'No more than one unique FORWARD HOST HEADER value can be set per cluster config. The following value(s) are not unique for this cluster:',
          ...output.map(obj => `**${obj.host}** was found in the **${obj.serviceName}** orders file.`)
        ],
        level: "failure",
        line: getLineNumber(deployment.ordersContents, /export FORWARD_HOST_HEADERS=/),
        path: deployment.ordersPath
      },
    ];
  }
  return results;
}

// go through all of the orders files and find the header im looking for
async function getOtherHostHeaderValuesFromCluster(clusterRoot) {
  const forwardHostHeadersFromOtherOrders = [];
  try {
    const files = await fs.readdir(clusterRoot, { withFileTypes: true });
    const directories = files.filter((file) => file.isDirectory());
    await Promise.all(
      directories.map(async (dir) => {
        const ordersPath = path.join(clusterRoot, dir.name, "orders");
        try {
          const result = await fs.readFile(ordersPath)
          const forwardHostHeaderValue = getExportValue(
            result,
            "FORWARD_HOST_HEADERS"
            );
            const hosts = forwardHostHeaderValue.split(",")
            forwardHostHeadersFromOtherOrders.push(...hosts.map(host => ({
              host,
              serviceName: dir.name
            })));
        } catch (err) {
          // not important
        }
      })
    );
  } catch (e) {
    console.error(e);
  }
  return forwardHostHeadersFromOtherOrders;
}

module.exports = noDuplicateForwardHostHeaders;
