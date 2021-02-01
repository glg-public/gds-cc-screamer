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
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`No Sourcing Other Files - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
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
  });

  return results;
}

module.exports = noSourcing;
