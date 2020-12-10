const core = require("@actions/core");

const sourceUse = /^source (.*)/gm;

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github
 */
async function noSourcing(orders, context) {
  core.info(`No Sourcing Other Files - ${orders.path}`);
  const results = [];

  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];
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
