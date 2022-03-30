require("../typedefs");
const log = require("loglevel");
const { getLineWithinObject } = require("../util");

const exportedVariable = /^export +(?<variable>\w+)=/;

/**
 * Rejects orders that export a variable more than once
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function noDuplicateExports(deployment) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`No Duplicate Exports - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  const counts = {};
  const lines = {};

  // Take one pass to determine where all the duplicates are
  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];

    const match = exportedVariable.exec(line);
    if (!match) {
      continue;
    }

    const { variable } = match.groups;
    if (!counts[variable]) {
      counts[variable] = 0;
      lines[variable] = [];
    }

    counts[variable] += 1;
    lines[variable].push(i + 1);
  }

  // Create a result for each dupe, notating where all of its duplicates are
  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];

    const match = exportedVariable.exec(line);
    if (!match) {
      continue;
    }

    const { variable } = match.groups;

    if (counts[variable] && counts[variable] > 1) {
      const result = {
        title: "Duplicate Export",
        path: deployment.ordersPath,
        problems: [
          `The variable \`${variable}\` is exported on multiple lines: **${lines[
            variable
          ].join(", ")}**`,
        ],
        line: i + 1,
        level: "warning",
      };

      results.push(result);
    }
  }

  if (deployment.secretsJson && deployment.secretsJsonContents) {
    deployment.secretsJson.forEach((secret) => {
      const { name } = secret;
      if (counts[name] && counts[name] > 0) {
        const regex = new RegExp(`"name"\\s*:\\s*"${name}"`);
        const line = getLineWithinObject(
          deployment.secretsJsonContents,
          secret,
          regex
        );
        const result = {
          title: "Duplicate Export",
          path: deployment.secretsJsonPath,
          line,
          level: "failure",
          problems: [
            `The variable \`${name}\` is already declared in orders on lines: **${lines[
              name
            ].join(", ")}**`,
            "ECS will not allow a deployment where an environment variable is declared in both `orders` (environment config) and in `secrets.json` (secret config).",
          ],
        };
        results.push(result);
      }
    });
  }

  return results;
}

module.exports = noDuplicateExports;
