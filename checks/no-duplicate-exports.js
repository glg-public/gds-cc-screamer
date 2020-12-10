const core = require("@actions/core");

const exportedVariable = /^export +(?<variable>\w+)=/;

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 */
async function noDuplicateExports(orders) {
  core.info(`No Duplicate Exports - ${orders.path}`);
  const results = [];

  const counts = {};
  const lines = {};

  // Take one pass to determine where all the duplicates are
  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];

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
  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];

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
