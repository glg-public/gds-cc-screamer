require('../typedefs');
const core = require("@actions/core");

const singleQuoteSubsitution = /export \w+='.*\$({|)\w+(}|).*'/;

/**
 * Flags the use of single quotes for bash substitution
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function validBashSubsitutions(deployment) {
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`Valid Bash Substitution - ${deployment.ordersPath}`);
  const results = [];

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];

    if (singleQuoteSubsitution.test(line)) {
      results.push({
        title: "Bad Substitution",
        problems: [
          `You must use double quotes for bash subsitutions.\n\`\`\`suggestion
${line.replace(/'/g, '"')}
\`\`\``,
        ],
        line: i + 1,
        level: "failure",
      });
    }
  }

  return results;
}

module.exports = validBashSubsitutions;
