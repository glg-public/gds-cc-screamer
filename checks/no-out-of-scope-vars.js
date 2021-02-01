require("../typedefs");
const core = require("@actions/core");

const exported = /^(export |)(?<variable>\w+)=.+/;

/**
 * Checks to make sure all used bash variables are defined within the orders file
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function noOutOfScopeVars(deployment) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`No Out Of Scope Variables - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];
  const exportedVars = new Set();
  
  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;
    
    let match = exported.exec(line);
    if (match) {
      const { variable } = match.groups;
      exportedVars.add(variable);
    }

    const result = {
      title: "Out of Scope Variable Reference",
      line: lineNumber,
      level: "failure",
      path: deployment.ordersPath,
      problems: [
        "GDS requires that all referenced variables be defined within the `orders` file. `.starphleet` has been deprecated."
      ]
    }
    const bashVar = /\$\{?(?<variable>\w+)\}?/g;
    match = bashVar.exec(line);
    while (match) {
      const { variable } = match.groups;

      if (!exportedVars.has(variable)) {
        result.problems.push(`**Undefined Variable:** \`${variable}\``,)
      }
      match = bashVar.exec(line);
    }

    if (result.problems.length > 1) {
      results.push(result);
    }
  });

  return results;
}

module.exports = noOutOfScopeVars;
