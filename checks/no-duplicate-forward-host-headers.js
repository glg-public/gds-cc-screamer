require("../typedefs");
const log = require("loglevel");
const path = require("path");
const fs = require("fs").promises;
const { getClusterType, getExportValue } = require("../util/generic");

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

  // Check if this is a jobs cluster
  const clusterType = getClusterType(context);
  if (clusterType === "jobs") {
    log.info('Jobs Cluster - Skipping Check: No Duplicate Forward Host Headers');
    return [];
  }

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

  //TODO: I dont love this being here or at least how the info is written at the moment - its confusing. Maybe remove it? It was also part of the template...
  // Inform people we are now at the meat of what check we are running
  log.info(`No Duplicate Forward Host Headers - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  // split the list of domain names in the variable by the , that separates them
  const forwardHostHeaderValueSplit = forwardHostHeaderValue.split(",");
  // console.log(forwardHostHeaderValueSplit);

  // the root path that will be used later to walk the tree
  const { clusterRoot } = inputs;

  // grab any existing forwardHostHeader values that already exist
  const otherForwardHostHeaderValues = await getOtherHostHeaderValuesFromCluster(clusterRoot);
  // console.log(clusterRoot)
  // console.log(otherForwardHostHeaderValues);

  //compare the two arrays and return any matches. This tells us that its
  // already in use and should not be allowed to proceed.
  const output = await otherForwardHostHeaderValues.filter(function (o1) {
    return forwardHostHeaderValueSplit.some(function (o2) {
      // console.log("start")
      // console.log(o1)
      // console.log(o2)
      // console.log("finish")
      return o1 === o2; // return the ones with equal id
    });
  });

  // the output from above occasionally comes back in another order than the test expects. This will order them alphabetically and fix tests.
  // console.log(output);
  output.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  // console.log(output);

  if ( output.length > 0 ) {
    return [
      {
        title: "Duplicate host header value",
        problems: [
          `No more than one unique FORWARD HOST HEADER value can be set per cluster config. The following value(s) are not unique for this cluster: ${output}`,
        ],
        level: "failure",
        line: 0,
        path: deployment.ordersPath
      },
    ];
  }


  // TODO: this can likely be removed - it was part of the template.
  // deployment.ordersContents.forEach((line, i) => {
  //   // GitHub lines are 1-indexed
  //   const lineNumber = i + 1;
  //   // do something
  // });

  return results;
}

// go through all of the orders files and find the header im looking for
async function getOtherHostHeaderValuesFromCluster(clusterRoot) {
  try {
    const files = await fs.readdir(clusterRoot, { withFileTypes: true });
    const directories = files.filter((file) => file.isDirectory());
    let forwardHostHeadersFromOtherOrders = [];
    await Promise.all(
      directories.map(async (dir) => {
        const ordersPath = path.join(clusterRoot, dir.name, "orders");
        try {
          await fs.readFile(ordersPath)
          .then(function(result) {
            const forwardHostHeaderValue = getExportValue(
            result,
            "FORWARD_HOST_HEADERS"
            );
            forwardHostHeadersFromOtherOrders.push(forwardHostHeaderValue);
          })
        } catch (err) {
          // not important
        }
      })
    );
    return forwardHostHeadersFromOtherOrders;
  } catch (e) {
    console.error(e);
  }
  // why is this here? If all above fails, just return -1?
  return -1;
}

module.exports = noDuplicateForwardHostHeaders;
