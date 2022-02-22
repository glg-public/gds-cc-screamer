require("../typedefs");
const log = require("loglevel");

const sourceUse = /^source (.*)/;

/**
 * Rejects orders that source from another file
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function noSourcing(deployment) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`No Sourcing Other Files - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    if (sourceUse.test(line)) {
      results.push({
        title: "No Use of `source`",
        path: deployment.ordersPath,
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
