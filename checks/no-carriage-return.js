require("../typedefs");
const core = require("@actions/core");

/**
 * Checks for windows-type carriage return characters, and suggests removing them.
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function noCarriageReturn(deployment, context, inputs) {
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`No Carriage Return Character - ${deployment.ordersPath}`);
  const results = [];

  function _removeCR(path) {
    return {
      title: "No Carriage Return Characters",
      problems: [
        `\`${path}\` contains invalid newline characters.`,
        "You must use Unix-type newlines (`LF`). Windows-type newlines (`CRLF`) are not permitted.",
      ],
      line: 0,
      level: "failure",
      path,
    };
  }

  if (
    deployment.ordersContents.filter((line) => line.includes("\r")).length > 0
  ) {
    results.push(_removeCR(deployment.ordersPath));
  }

  if (
    deployment.secretsContents &&
    deployment.secretsContents.filter((line) => line.includes("\r")).length > 0
  ) {
    results.push(_removeCR(deployment.secretsPath));
  }

  if (
    deployment.policyJsonContents &&
    deployment.policyJsonContents.filter((line) => line.includes("\r")).length > 0
  ) {
    results.push(_removeCR(deployment.policyJsonPath));
  }

  return results;
}

module.exports = noCarriageReturn;
