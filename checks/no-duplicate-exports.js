require('../typedefs');
const core = require("@actions/core");

const exportedVariable = /^export +(?<variable>\w+)=/;

/**
 * Rejects orders that export a variable more than once
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function noDuplicateExports(deployment) {
  if (!deployment.ordersContents) {
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`No Duplicate Exports - ${deployment.ordersPath}`);

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
        problems: [
          `The variable \`${variable}\` is exported on multiple lines: **${lines[
            variable
          ].join(", ")}**`,
        ],
        line: i + 1,
        level: "failure",
      };

      results.push(result);
    }
  }

  return results;
}

module.exports = noDuplicateExports;
