const core = require("@actions/core");
const { getLinesForJSON } = require("../util");

const secretArn = /arn:aws:secretsmanager:(?<region>[\w-]*):(?<account>\d*):secret:(?<secretName>[\w-\/]*):(?<jsonKey>\S*?):(?<versionStage>\S*?):(?<versionId>\w*)/;

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github
 */
async function secretsJsonIsValid(orders, context) {
  const results = [];

  // secrets.json is not required
  if (!orders.secretsContents) {
    core.info(`No secrets.json present, skipping - ${orders.path}`);
    return results;
  }

  core.info(`secrets.json is valid - ${orders.secretsPath}`);

  // secrets.json must be valid json
  let secretsJson;
  try {
    secretsJson = JSON.parse(orders.secretsContents.join("\n"));
  } catch (e) {
    return [
      {
        title: "secrets.json is not valid JSON",
        path: orders.secretsPath,
        problems: [
          `An error was encountered while trying to JSON parse ${orders.secretsPath}`,
        ],
        line: 0,
        level: "failure",
      },
    ];
  }

  // secrets.json must be an array
  if (!Array.isArray(secretsJson)) {
    return [
      {
        title: `Invalid secrets.json`,
        path: orders.secretsPath,
        problems: [
          "secrets.json must be an array of objects like `[{ name, valueFrom }]`",
        ],
        line: 1,
        level: "failure",
      },
    ];
  }

  for (let secret of secretsJson) {
    if (Object.prototype.toString.call(secret) !== "[object Object]") {
      return [
        {
          title: `Invalid secrets.json`,
          path: orders.secretsPath,
          problems: [
            "secrets.json must be an array of objects like `[{ name, valueFrom }]`",
          ],
          line: 1,
          level: "failure",
        },
      ];
    }

    const result = {
      title: "Invalid Secret Structure",
      problems: [],
      level: "failure",
      path: orders.secretsPath,
    };

    const lines = getLinesForJSON(orders.secretsContents, secret);
    if (lines.start === lines.end) {
      result.line = lines.start;
    } else {
      result.line = lines;
    }

    if (!secret.hasOwnProperty("name") || !secret.hasOwnProperty("valueFrom")) {
      result.problems.push(
        "Each secret must be an object like { name, valueFrom }"
      );
    }

    if (secret.name && typeof secret.name !== "string") {
      result.problems.push("secret.name must be a string.");
    }

    if (secret.valueFrom && typeof secret.valueFrom !== "string") {
      result.problems.push("secret.valueFrom must be a string.");
    }

    if (Object.keys(secret).length > 2) {
      result.problems.push(
        'Each secret must **only** contain the keys "name" and "valueFrom".'
      );
    }

    if (secret.valueFrom && secret.name && !secretArn.test(secret.valueFrom)) {
      result.problems.push(`Invalid secret ARN: ${secret.valueFrom}`);
      result.title = `Invalid Secret: ${secret.name}`;
    }

    if (result.problems.length > 0) {
      results.push(result);
    }
  }

  // Mark this as valid, so future checks don't have to redo this work
  if (results.length === 0) {
    orders.secretsJson = secretsJson;
  }
  return results;
}

module.exports = secretsJsonIsValid;
