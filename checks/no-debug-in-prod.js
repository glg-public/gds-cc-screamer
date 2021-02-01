require('../typedefs');
const core = require("@actions/core");

const enableDebug = /^export +ENABLE_DEBUG=["']?true["']?/;
const debug = /^export +DEBUG=["']?((?!false)[\w\*]+)["']?/;
const logLevel = /^export +[\w]*LOG_LEVEL=["']?(debug|verbose)["']?/;

const debugs = [
  enableDebug,
  debug,
  logLevel
];

/**
 * Checks for some known debug options, and warns about them
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function noDebugInProd(deployment) {
  if (!deployment.ordersContents) {
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`No Debug In Production - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];
 
  deployment.ordersContents.forEach((line, i) => {
    const result = {
      title: 'Debug In Production',
      path: deployment.ordersPath,
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