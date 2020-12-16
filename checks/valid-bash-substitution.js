require('../typedefs');
const core = require("@actions/core");

const singleQuoteSubsitution = /export \w+='.*\$({|)\w+(}|).*'/;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function validBashSubsitutions(deployment) {
  core.info(`Valid Bash Substitution - ${deployment.path}`);
  const results = [];

  for (let i = 0; i < deployment.contents.length; i++) {
    const line = deployment.contents[i];

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
