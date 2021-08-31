require("../typedefs");
const log = require("loglevel");
const validator = require("validator");

const envvar = /^(export +|)(\w+)=['"]?([^\n\r]+?)['"]?$/;
const dockerdeploy =
  /^dockerdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const jobdeploy =
  /^jobdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const autodeploy =
  /^autodeploy git@github.com:(?<org>[\w-]+)\/(?<repo>.+?)(.git|)#(?<branch>.+)/;
const bashVar = /\$\{?(?<variable>\w+)\}?/;
const gitURL = /git@github\.com:\w+\/[\w\d\-]+/;
const reservedVars = new Set([
  "GDS_FQDN",
  "SESSION_ACCESS_FLAGS",
  "SECURITY_MODE",
  "JWT_ACCESS_FLAGS",
  "CMD",
  "ECS_SCHEDULED_TASK_CRON",
]);
const allowSecretVars = new Set([
  "SECRETS_AWS_REGION",
  "SECRETS_CREDENTIAL_SOURCE",
  "SECRETS_LOG_LEVEL",
  "SECRETS_NAMESPACE",
]);

/**
 * Checks orders file for potential secrets
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function potentialSecrets(deployment) {
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
    str = str.trim();
    const regex = [dockerdeploy, jobdeploy, autodeploy, bashVar, gitURL];

    const validators = [
      { test: "isEmail" },
      { test: "isFQDN" },
      { test: "isIMEI" },
      { test: "isISBN" },
      { test: "isISO8601" },
      { test: "isMACAddress" },
      { test: "isRFC3339" },
      {
        test: "isURL",
        options: { protocols: ["http", "https", "ftp", "redis"] },
      },
      { test: "isJSON" },
      { test: "isMD5" },
      { test: "isHash" },
    ];

    for (const test of regex) {
      if (test.test(str)) {
        return true;
      }
    }

    for (const { test, options } of validators) {
      if (validator[test](str, options)) {
        return true;
      }
    }
    return false;
  }

  function _isProblem(str) {
    str = str.trim();
    const validators = [
      "isBtcAddress",
      "isCreditCard",
      "isEthereumAddress",
      "isIBAN",
      "isJWT",
      "isStrongPassword",
      "isTaxID",
      "isUUID",
    ];

    for (const test of validators) {
      if (validator[test](str)) {
        return test;
      }
    }

    if (_entropy(str) > 4) {
      return "highEntropy";
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
      } else if (/secret/i.test(name) && !allowSecretVars.has(name)) {
        result.title = "Secrets Should Be In Secrets Manager";
      } else if (!reservedVars.has(name) && !_isAnException(value)) {
        const reason = _isProblem(value);
        if (reason) {
          result.title = "Possible Secret?";
          result.problems.push(
            `This was flagged as \`${reason}\`. If this is definitely not a secret, disregard.`
          );
        }
      }

      if (result.title) {
        results.push(result);
      }
    }
  });

  return results;
}

module.exports = potentialSecrets;
