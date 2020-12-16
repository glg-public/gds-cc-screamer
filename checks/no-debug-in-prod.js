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
 * Accepts an orders object, and does some kind of check
 * @param {Deployment} deployment
 */
async function noDebugInProd(deployment) {
  core.info(`No Debug In Production - ${deployment.path}`);
  const results = [];
 
  deployment.contents.forEach((line, i) => {
    const result = {
      title: 'Debug In Production',
      path: deployment.path,
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