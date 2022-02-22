require("../typedefs");
const log = require("loglevel");

const exportLine = /^export\s(?<variable>.*?)\s*=\s*(?<value>.*)/i;

/**
 * Rejects improper syntax for bash variable definitions
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function noSpacesInExports(deployment) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`No Spaces in Exports - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
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
        path: deployment.ordersPath,
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
