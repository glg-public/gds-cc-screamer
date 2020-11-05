const core = require('@actions/core');

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders 
 */
async function templateCheck(orders) {
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