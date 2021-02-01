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
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`Valid Bash Substitution - ${deployment.ordersPath}`);
  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
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
  })

  return results;
}

module.exports = validBashSubsitutions;
