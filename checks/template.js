const core = require("@actions/core");

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github
 */
async function templateCheck(orders, context, inputs) {
  core.info(`Template Check - ${orders.path}`);
  const results = [];
  /**
   * A Result Object:
   {
    title: 'Failing Check',
    problems: ['This code sucks'],
    line: lineNumber,
    level: 'failure' // must be "failure", "warning", "notice", or "success"
   }
   */

  orders.contents.forEach((line, i) => {
    const lineNumber = i + 1;
    // do something
  });

  return results;
}

module.exports = templateCheck;
