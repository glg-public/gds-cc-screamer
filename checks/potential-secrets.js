require("../typedefs");
const log = require("loglevel");
const validator = require("validator");
const { codeBlock } = require("../util");

const envvar = /^(export +|)(\w+)=['"]?([^\n\r]+?)['"]?$/;
const dockerdeploy =
  /^dockerdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const jobdeploy =
  /^jobdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const autodeploy =
  /^autodeploy git@github.com:(?<org>[\w-]+)\/(?<repo>.+?)(.git|)#(?<branch>.+)/;
const bashVar = /\$\{?(?<variable>\w+)\}?/;
const gitURL = /git@github\.com:\w+\/[\w\d\-]+/;
const isPlainNumber = /^[\d\.]+$/;
const containsURL =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
const isAFile = /.+\.\w{2,3}$/;
const globalReservedVars = new Set([
  "GDS_FQDN",
  "SESSION_ACCESS_FLAGS",
  "SECURITY_MODE",
  "JWT_ACCESS_FLAGS",
  "CMD",
  "ECS_SCHEDULED_TASK_CRON",
  "PRIVATE_SECRET_NAMESPACES",
]);
const allowSecretVars = new Set([
  "SECRETS_AWS_REGION",
  "SECRETS_CREDENTIAL_SOURCE",
  "SECRETS_LOG_LEVEL",
  "SECRETS_NAMESPACE",
  "BLOCKED_SECRET_NAMESPACES",
  "PRIVATE_SECRET_NAMESPACES",
]);

const isAnEmailList = {
  test: (txt) => {
    const list = txt.split(",");
    if (list.length === 1) {
      return false;
    }
    for (let item of list) {
      if (!validator.isEmail(item)) {
        return false;
      }
    }
    return true;
  },
};

const isAnEpiTemplate = {
  test: (txt) => txt.endsWith(".sql") || txt.endsWith(".mustache"),
};

const isEscapedJson = {
  test: (txt) => {
    const unescaped = txt.replace(/\\"/g, '"');
    try {
      JSON.parse(unescaped);
      return true;
    } catch (e) {
      return false;
    }
  },
};

/**
 * Checks orders file for potential secrets
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function potentialSecrets(deployment, context, inputs) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Potential Secrets - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  const reservedVars = new Set(globalReservedVars);

  /**
   * Users can add service-specific exclusions for variables
   * that are often mistaken as secrets.
   */
  const exclusions =
    inputs?.config?.[deployment.serviceName]?.potentialSecrets?.exclusions;
  if (exclusions && !Array.isArray(exclusions)) {
    results.push({
      title: "Malformed Configuration",
      level: "warning",
      line: 0,
      path: ".ccscreamer.json",
      problems: [
        `There is a syntax error in .ccscreamer.json related to the check \`potentialSecrets\` and the service \`${deployment.serviceName}\`. [Reference](https://github.com/glg-public/gds-cc-screamer#configuration)`,
      ],
    });
  }
  if (exclusions) {
    exclusions.forEach((envvar) => reservedVars.add(envvar));
  }

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

  /**
   * Returns true for comma-separated lists
   * which do not contain secrets within them.
   */
  const isListOfNonSecrets = {
    test: (txt) => {
      const list = txt.split(",");
      if (list.length === 1) {
        return false;
      }
      for (const item of list) {
        if (!_isAnException(item) && _isProblem(item)) {
          return false;
        }
      }
      return true;
    },
  };

  function _isAnException(str) {
    str = str.trim();
    const regex = [
      dockerdeploy,
      jobdeploy,
      autodeploy,
      bashVar,
      gitURL,
      isPlainNumber,
      isAnEmailList,
      isAnEpiTemplate,
      containsURL,
      isAFile,
      isListOfNonSecrets,
      isEscapedJson,
    ];

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
          const update = codeBlock(
            JSON.stringify(
              {
                [deployment.serviceName]: {
                  potentialSecrets: {
                    exclusions: [name],
                  },
                },
              },
              null,
              2
            ),
            "json"
          );
          result.title = "Possible Secret?";
          result.problems.push(
            `This was flagged as \`${reason}\`. If this is definitely not a secret, update \`.ccscreamer.json\` to include the following:\n${update}\n[Documentation](https://github.com/glg-public/gds-cc-screamer#potentialsecretsexclusions)`
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
