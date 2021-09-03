require("../typedefs");
const log = require("loglevel");
const { suggest } = require("../util");

const doubleQuoted = /^["']{2}.*["']{2}$/;
const envvar = /^(export |)(?<variable>\w+)=(?<value>.+)$/;
const bashSubstitution = /\${?[\w\-]+}?/;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function doubleQuotes(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Template Check - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;

    const match = envvar.exec(line);
    if (match) {
      const { value } = match.groups;
      if (doubleQuoted.test(value)) {
        const result = {
          title: "Double Quoted Value",
          level: "notice",
          line: lineNumber,
          path: deployment.ordersPath,
          problems: [],
        };

        if (bashSubstitution.test(value)) {
          const fixedValue = value
            .replace(/^['"]{2}/, '"')
            .replace(/['"]{2}$/, '"');
          const fixed = line.replace(value, fixedValue);
          result.problems.push(suggest("Just use double quotes", fixed));
        } else {
          const fixedValue = value
            .replace(/^['"]{2}/, "'")
            .replace(/['"]{2}$/, "'");
          const fixed = line.replace(value, fixedValue);
          result.problems.push(suggest("Just use single quotes", fixed));
        }

        results.push(result);
      }
    }
  });

  return results;
}

module.exports = doubleQuotes;
