/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders 
 */
async function templateCheck(orders) {
  const problems = [];
  let lineNumber = 0;

  return [{
    title: 'Failing Check',
    problems,
    line: lineNumber,
    fail: true
  }];
}

module.exports = templateCheck;