const core = require("@actions/core");

const enableDebug = /^export +ENABLE_DEBUG=["']?true["']?/;
const debug = /^export +DEBUG=["']?((?!false)[\w\*]+)["']?/;
const logLevel = /^export +[\w]*LOG_LEVEL=["']?(debug|verbose)["']?/;

const debugs = [
  enableDebug,
  debug,
  logLevel
]

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github
 */
async function noDebugInProd(orders) {
  core.info(`No Debug In Production - ${orders.path}`);
  const results = [];
 
  orders.contents.forEach((line, i) => {
    const result = {
      title: 'Debug In Production',
      path: orders.path,
      line: i+1,
      problems: [],
      level: 'warning',
    };

    debugs.forEach(regex => {
      if (regex.test(line)) {
        result.problems.push('Did you mean to leave this configured this way in production?');
      }
    });

    if (result.problems.length > 0) {
      results.push(result);
    }
  });

  return results;
}

module.exports = noDebugInProd;