require('../typedefs');
const core = require("@actions/core");

const exportLine = /^export\s(?<variable>.*?)\s*=\s*(?<value>.*)/i;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function noSpacesInExports(deployment) {
  core.info(`No Spaces in Exports - ${deployment.ordersPath}`);
  const results = [];

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];
    const match = exportLine.exec(line);
    if (!match) {
      continue;
    }

    if (line.includes(" =") || line.includes("= ")) {
      const { variable, value } = match.groups;
      results.push({
        title: "No Spaces in Exports",
        problems: [
          `Trim out this whitespace\n\`\`\`suggestion
export ${variable}=${value}
\`\`\``,
        ],
        line: i + 1,
        level: "failure",
      });
    }
  }

  return results;
}

module.exports = noSpacesInExports;
