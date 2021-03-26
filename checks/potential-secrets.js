require("../typedefs");
const log = require("loglevel");

const envvar = /^(export +|)(\w+)=['"]?([^\n\r]+?)['"]?$/;
const dockerdeploy = /^dockerdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const jobdeploy = /^jobdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const autodeploy = /^autodeploy git@github.com:(?<org>[\w-]+)\/(?<repo>.+?)(.git|)#(?<branch>.+)/;
const bashVar = /\$\{?(?<variable>\w+)\}?/;
const url = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

/**
 * Checks orders file for potential secrets
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function potentialSecrets(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Potential Secrets - ${deployment.ordersPath}`);

  /**
   * Calculates the Shannon Entropy of a string
   * Yoinked from https://rosettacode.org/wiki/Entropy#JavaScript
   * @param {string} str
   * @returns {number}
   */
  function _entropy(str) {
    const len = str.length;

    // Build a frequency map from the string.
    const frequencies = Array.from(str).reduce(
      (freq, c) => (freq[c] = (freq[c] || 0) + 1) && freq,
      {}
    );

    // Sum the frequency of each character.
    return Object.values(frequencies).reduce(
      (sum, f) => sum - (f / len) * Math.log2(f / len),
      0
    );
  }

  function _isAnException(str) {
    const tests = [dockerdeploy, jobdeploy, autodeploy, bashVar, url];

    for (let test of tests) {
      if (test.test(str)) {
        return true;
      }
    }
    return false;
  }

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;

    const match = envvar.exec(line);
    if (match) {
      const [, exported, name, value] = match;
      const result = {
        level: "warning",
        path: deployment.ordersPath,
        line: lineNumber,
        problems: [
          "This looks like it might be a secret. You should probably store this in AWS Secrets Manager.",
        ],
      };
      if (/password/i.test(name)) {
        result.title = "Passwords Should Be In Secrets Manager";
      } else if (/secret/i.test(name)) {
        result.title = "Secrets Should Be In Secrets Manager";
      } else if (_entropy(value) > 3 && !_isAnException(value)) {
        result.title = "Possible Secret?";
        result.problems.push(
          "This was flagged because of high entropy in the value. If this is definitely not a secret, disregard."
        );
      }

      if (result.title) {
        results.push(result);
      }
    }
  });

  return results;
}

module.exports = potentialSecrets;
