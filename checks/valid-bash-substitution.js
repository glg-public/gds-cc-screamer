require("../typedefs");
const log = require("loglevel");

// we expect these to match the regex, but they should not be flagged
const EXCLUDED_VARIABLE_NAMES = ["CMD", "ENTRYPOINT", "HTPASSWD"];
const singleQuoteSubsitution = /export (?<variable>\w+)='.*\$({|)\w+(}|).*'/;

/**
 * Flags the use of single quotes for bash substitution
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function validBashSubsitutions(deployment) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Valid Bash Substitution - ${deployment.ordersPath}`);
  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    const match = line.match(singleQuoteSubsitution);
    if (match && !EXCLUDED_VARIABLE_NAMES.includes(match.groups.variable)) {
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
  });

  return results;
}

module.exports = validBashSubsitutions;
