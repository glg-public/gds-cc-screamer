require("../typedefs");
const core = require("@actions/core");
const { codeBlock } = require("../util");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function validTemplatesJson(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.templatesJson) {
    console.log(
      `No templates.json Present - Skipping ${deployment.serviceName}`
    );
    return [];
  }
  console.log(`templates.json is valid - ${deployment.templatesJsonPath}`);

  /** @type {Array<Result>} */
  const results = [];

  try {
    deployment.templatesJson = JSON.parse(
      deployment.templatesJsonContents.join("/n")
    );
  } catch (e) {
    results.push({
      title: "templates.json is invalid JSON",
      level: "warning",
      line: 0,
      problems: [
        "`templates.json` file could not be parsed as valid JSON",
        codeBlock(e, "shell"),
      ],
      path: deployment.templatesJsonPath,
    });
    return results;
  }

  if (!Array.isArray(deployment.templatesJson.secure)) {
    results.push({
      title: "templates.json - syntax error",
      level: "warning",
      line: 1,
      problems: [
        '`templates.json` must be a JSON object like `{"secure": [<templateNames>]}`',
      ],
      path: deployment.templatesJsonPath,
    });
    return results;
  }

  if (inputs.deployinatorToken) {
    deployment.templatesJson.secure.forEach((templateName, i) => {});
  }

  return results;
}

module.exports = validTemplatesJson;
