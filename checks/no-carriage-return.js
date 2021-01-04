require('../typedefs');
const core = require("@actions/core");
const { suggest } = require('../util');

/**
 * Checks for windows-type carriage return characters, and suggests removing them.
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * 
 * @returns {Array<Result>}
 */
async function noCarriageReturn(deployment, context, inputs) {
  core.info(`No Carriage Return Character - ${deployment.ordersPath}`);
  const results = [];
  
  function _removeCR(line, lineNumber, path) {
    return {
      title: 'No Carriage Return Characters',
      problems: [
        'You must use Unix-type newlines (`\\n`). Windows-type newlines (`\\r\\n`) are not permitted.',
        suggest('Delete the carriage return character', line.replace(/\r/g, '\n'))
      ],
      line: lineNumber,
      level: 'failure',
      path
    }
  }

  deployment.ordersContents.forEach((line, i) => {
    if (line.includes('\r')) {
      results.push(_removeCR(line, i + 1, deployment.ordersPath));
    }
  });

  if (deployment.secretsContents) {
    deployment.secretsContents.forEach((line, i) => {
      if (line.includes('\r')) {
        results.push(_removeCR(line, i + 1, deployment.secretsPath));
      }
    });
  }

  if (deployment.policyContents) {
    deployment.policyContents.forEach((line, i) => {
      if (line.includes('\r')) {
        results.push(_removeCR(line, i + 1, deployment.policyPath));
      }
    });
  }
  

  return results;
}

module.exports = noCarriageReturn;
