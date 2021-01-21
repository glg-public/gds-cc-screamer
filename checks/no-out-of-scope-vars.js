require("../typedefs");
const core = require("@actions/core");

const bashVar = /\$\{?(?<variable>\w+)\}?/;
const exported = /^export (?<variable>\w+)=.+/;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function noOutOfScopeVars(deployment) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`No Out Of Scope Variables - ${deployment.ordersPath}`);
  const results = [];
  const exportedVars = new Set();
  
  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;
    
    let match = exported.exec(line);
    if (match) {
      const { variable } = match.groups;
      exportedVars.add(variable);
    }

    match = bashVar.exec(line);
    if (match) {
      const { variable } = match.groups;

      if (!exportedVars.has(variable)) {
        results.push({
          title: "Out of Scope Variable Reference",
          line: lineNumber,
          level: "failure",
          path: deployment.ordersPath,
          problems: [
            `Undefined Variable: \`${variable}\``,
            "GDS requires that all referenced variables be defined within the `orders` file. `.starphleet` has been deprecated."
          ]
        })
      }
    }
  });

  return results;
}

module.exports = noOutOfScopeVars;
