require("../typedefs");
const log = require("loglevel");
const { getLinesForJSON, suggest, getLineWithinObject } = require("../util");

const secretArn =
  /arn:([\w\*\-]*):secretsmanager:([\w-]*):(\d*):secret:([\w-\/]*):?(\S*?):?(\S*?):?(\w*)/;

const versionSuffix = /-[a-zA-Z0-9]{6}$/;

/**
 * Checks the validity of a secrets.json
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function secretsJsonIsValid(deployment) {
  /** @type {Array<Result>} */
  const results = [];

  // secrets.json is not required
  if (!deployment.secretsJsonContents) {
    log.info(`No secrets.json present, skipping - ${deployment.serviceName}`);
    return results;
  }

  log.info(`secrets.json is valid - ${deployment.secretsJsonPath}`);

  // secrets.json must be valid json
  let secretsJson;
  try {
    secretsJson = JSON.parse(deployment.secretsJsonContents.join("\n"));
  } catch (e) {
    return [
      {
        title: "secrets.json is not valid JSON",
        path: deployment.secretsJsonPath,
        problems: [
          `An error was encountered while trying to JSON parse ${deployment.secretsJsonPath}`,
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
        path: deployment.secretsJsonPath,
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
          path: deployment.secretsJsonPath,
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
      path: deployment.secretsJsonPath,
    };

    const lines = getLinesForJSON(deployment.secretsJsonContents, secret);
    if (lines.start === lines.end) {
      result.line = lines.start;
    } else {
      result.line = lines;
    }

    // This object will end up with correctly cased keys
    const standardSecret = JSON.parse(JSON.stringify(secret));

    // Suggest casing corrections
    Object.keys(secret).forEach((key) => {
      const wrongCaseForName = key.toLowerCase() === "name" && key !== "name";
      const wrongCaseForValueFrom =
        key.toLowerCase() === "valuefrom" && key !== "valueFrom";

      if (wrongCaseForName) {
        const regex = new RegExp(`"${key}":`);
        const lineNumber = getLineWithinObject(
          deployment.secretsJsonContents,
          secret,
          regex
        );
        results.push({
          title: "Incorrect Casing",
          level: "failure",
          path: deployment.secretsJsonPath,
          line: lineNumber,
          problems: [
            suggest(
              "Lowercase this key:",
              deployment.secretsJsonContents[lineNumber - 1].replace(
                regex,
                '"name":'
              )
            ),
          ],
        });
        standardSecret.name = secret[key];
      } else if (wrongCaseForValueFrom) {
        const regex = new RegExp(`"${key}":`);
        const lineNumber = getLineWithinObject(
          deployment.secretsJsonContents,
          secret,
          regex
        );
        results.push({
          title: "Incorrect Casing",
          level: "failure",
          path: deployment.secretsJsonPath,
          line: lineNumber,
          problems: [
            suggest(
              "Lowercase this key:",
              deployment.secretsJsonContents[lineNumber - 1].replace(
                regex,
                '"valueFrom":'
              )
            ),
          ],
        });
        standardSecret.valueFrom = secret[key];
      }
    });

    if (
      !standardSecret.hasOwnProperty("name") ||
      !standardSecret.hasOwnProperty("valueFrom")
    ) {
      result.problems.push(
        "Each secret must be an object like { name, valueFrom }"
      );
    }

    if (standardSecret.name && typeof standardSecret.name !== "string") {
      result.problems.push("secret.name must be a string.");
    }

    if (
      standardSecret.valueFrom &&
      typeof standardSecret.valueFrom !== "string"
    ) {
      result.problems.push("secret.valueFrom must be a string.");
    }

    if (Object.keys(secret).length > 2) {
      result.problems.push(
        'Each secret must **only** contain the keys "name" and "valueFrom".'
      );
    }

    if (
      standardSecret.valueFrom &&
      standardSecret.name &&
      !secretArn.test(standardSecret.valueFrom)
    ) {
      result.problems.push(`Invalid secret ARN: ${standardSecret.valueFrom}`);
      result.title = `Invalid Secret: ${standardSecret.name}`;
    }

    if (
      standardSecret.valueFrom &&
      standardSecret.name &&
      secretArn.test(standardSecret.valueFrom) &&
      versionSuffix.test(standardSecret.valueFrom)
    ) {
      result.problems.push(
        `Having your secret name end in ${versionSuffix} causes problems because this is also an accepted syntax for specifying secret version. If your intention is to specify a version, please use format: \`arn:aws:secretsmanager:region:aws_account_id:secret:secret-name:json-key:version-stage:version-id\`.  If this is not your intention, please rename your secret, possibly using underscore instead of hyphen.`
      );
      result.title = `Secret Name or Secret Version?`;
    }

    if (result.problems.length > 0) {
      results.push(result);
    }
  }

  // Mark this as valid, so future checks don't have to redo this work
  if (results.length === 0) {
    deployment.secretsJson = secretsJson;
  }
  return results;
}

module.exports = secretsJsonIsValid;
