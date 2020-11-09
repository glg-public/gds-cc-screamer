const core = require('@actions/core');

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github 
 */
async function templateCheck(orders, context) {
  core.info(`Template Check - ${orders.path}`);
  const problems = [];
  let lineNumber = 0;

  return [{
    title: 'Failing Check',
    problems,
    line: lineNumber,
    level: 'failure' // must be "failure", "warning", "notice", or "success"
  }];
}

module.exports = templateCheck;