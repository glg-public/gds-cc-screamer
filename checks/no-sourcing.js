require('../typedefs');
const core = require("@actions/core");

const sourceUse = /^source (.*)/;

/**
 * Rejects orders that source from another file
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function noSourcing(deployment) {
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`No Sourcing Other Files - ${deployment.ordersPath}`);
  const results = [];

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];
    if (sourceUse.test(line)) {
      results.push({
        title: "No Use of `source`",
        problems: [
          "You should not source any other files in your orders files.",
        ],
        line: i + 1,
        level: "failure",
      });
    }
  }

  return results;
}

module.exports = noSourcing;
