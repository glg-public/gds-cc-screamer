const core = require("@actions/core");
const { getLinesForJSON, suggest, getLineWithinObject } = require("../util");

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

    // This object will end up with correctly cased keys
    const standardSecret = Object.assign({}, secret);

    // Suggest casing corrections
    Object.keys(secret).forEach((key) => {
      const wrongCaseForName = key.toLowerCase() === "name" && key !== "name";
      const wrongCaseForValueFrom =
        key.toLowerCase() === "valuefrom" && key !== "valueFrom";

      if (wrongCaseForName) {
        const regex = new RegExp(`"${key}":`);
        const lineNumber = getLineWithinObject(
          orders.secretsContents,
          secret,
          regex
        );
        results.push({
          title: "Incorrect Casing",
          level: "failure",
          path: orders.secretsPath,
          line: lineNumber,
          problems: [
            suggest(
              "Lowercase this key:",
              orders.secretsContents[lineNumber - 1].replace(regex, '"name":')
            ),
          ],
        });
        standardSecret.name = secret[key];
      } else if (wrongCaseForValueFrom) {
        const regex = new RegExp(`"${key}":`);
        const lineNumber = getLineWithinObject(
          orders.secretsContents,
          secret,
          regex
        );
        results.push({
          title: "Incorrect Casing",
          level: "failure",
          path: orders.secretsPath,
          line: lineNumber,
          problems: [
            suggest(
              "Lowercase this key:",
              orders.secretsContents[lineNumber - 1].replace(
                regex,
                '"valueFrom":'
              )
            ),
          ],
        });
        standardSecret.valueFrom = secret[key];
      }
    });

    if (!standardSecret.hasOwnProperty("name") || !standardSecret.hasOwnProperty("valueFrom")) {
      result.problems.push(
        "Each secret must be an object like { name, valueFrom }"
      );
    }

    if (standardSecret.name && typeof standardSecret.name !== "string") {
      result.problems.push("secret.name must be a string.");
    }

    if (standardSecret.valueFrom && typeof standardSecret.valueFrom !== "string") {
      result.problems.push("secret.valueFrom must be a string.");
    }

    if (Object.keys(secret).length > 2) {
      result.problems.push(
        'Each secret must **only** contain the keys "name" and "valueFrom".'
      );
    }

    if (standardSecret.valueFrom && standardSecret.name && !secretArn.test(standardSecret.valueFrom)) {
      result.problems.push(`Invalid secret ARN: ${standardSecret.valueFrom}`);
      result.title = `Invalid Secret: ${standardSecret.name}`;
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
