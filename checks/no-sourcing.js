require('../typedefs');
const core = require("@actions/core");

const sourceUse = /^source (.*)/;

/**
 * Accepts an orders object, and does some kind of check
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function noSourcing(deployment) {
  core.info(`No Sourcing Other Files - ${deployment.path}`);
  const results = [];

  for (let i = 0; i < deployment.contents.length; i++) {
    const line = deployment.contents[i];
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
