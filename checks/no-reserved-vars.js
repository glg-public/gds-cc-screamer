require("../typedefs");
const core = require("@actions/core");

const reserved = new Set(["JWT_SECRET"]);

const envvar = /^(export |)(\w+)=.+/;

/**
 * Accepts a deployment object, and verified that it does not contain reserved variables
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function noReservedVars(deployment) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`Template Check - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;

    const match = envvar.exec(line);
    if (match) {
      const variable = match[2];
      if (reserved.has(variable)) {
        results.push({
          title: "No Reserved Variables",
          path: deployment.ordersPath,
          level: "failure",
          line: lineNumber,
          problems: [
            `\`${variable}\` is a reserved variable name in GDS. You will need to rename this variable.`,
          ],
        });
      }
    }
  });

  return results;
}

module.exports = noReservedVars;
