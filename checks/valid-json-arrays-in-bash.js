require("../typedefs");
const log = require("loglevel");

/**
 * Accepts a deployment object, and checks that any CMD or ENTRYPOINT variables
*  are correctly structured.
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function validJsonArrayInBash(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`CMD/ENTRYPOINT are valid JSON - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;
    // this test only checks CMD and ENTRYPOINT values
    const r = line.match(/export\s+(CMD|ENTRYPOINT)=(['"])(.*)\2/);

    if (r) {
      // get value and name of the variable
      const variableName = r[1];
      const value = r[3];

      try {
        // Is value valid JSON?
        const obj = JSON.parse(value);

        // it is JSON, but is it an array?
        if (!Array.isArray(obj)) {
          let suggestion = "";

          if (typeof obj === "string") {
            // Try to convert string into valid json array
            const newArray = JSON.stringify(obj.split(/\s+/));
            suggestion = `\`\`\`suggestion
export ${variableName}='${newArray}'
\`\`\``;
          }

          results.push({
            title: `${variableName} is not a JSON Array`,
            problems: [
              `The contents of the ${variableName} variable must contain a valid JSON Array.\n${suggestion}`
            ],
            line: lineNumber,
            level: "failure",
          });
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          results.push({
            title: `${variableName} does not parse`,
            problems: [
              `The contents of the ${variableName} variable must contain valid stringified JSON.`
            ],
            line: lineNumber,
            level: "failure",
          });
        } else {
          throw e;
        }
      }
    }
  });

  return results;
}

module.exports = validJsonArrayInBash;
