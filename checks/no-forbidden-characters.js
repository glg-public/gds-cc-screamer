require("../typedefs");
const log = require("loglevel");

const forbidden = {
  "\r": function (path, line) {
    return {
      title: "No Carriage Return Characters",
      problems: [
        `\`${path}\` contains invalid newline characters.`,
        "You must use Unix-type newlines (`LF`). Windows-type newlines (`CRLF`) are not permitted.",
      ],
      line,
      level: "failure",
      path,
    };
  },
  "\uFFFC": function (path, line) {
    return {
      title: "No Null Character",
      problems: [
        "There is a null character on this line that will break the deployment",
      ],
      line,
      level: "failure",
      path,
    };
  },
};

/**
 * Checks for windows-type carriage return characters, and suggests removing them.
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function noForbiddenCharacters(deployment, context, inputs) {
  log.info(`No Carriage Return Character - ${deployment.serviceName}`);

  /** @type {Array<Result>} */
  const results = [];

  if (deployment.ordersContents) {
    deployment.ordersContents.forEach((line, i) => {
      Object.keys(forbidden).forEach((char) => {
        if (line.includes(char)) {
          results.push(forbidden[char](deployment.ordersPath, i + 1));
        }
      });
    });
  }

  if (deployment.secretsJsonContents) {
    deployment.secretsJsonContents.forEach((line, i) => {
      Object.keys(forbidden).forEach((char) => {
        if (line.includes(char)) {
          results.push(forbidden[char](deployment.secretsJsonPath, i + 1));
        }
      });
    });
  }

  if (deployment.policyJsonContents) {
    deployment.policyJsonContents.forEach((line, i) => {
      Object.keys(forbidden).forEach((char) => {
        if (line.includes(char)) {
          results.push(forbidden[char](deployment.policyJsonPath, i + 1));
        }
      });
    });
  }

  if (deployment.templatesJsonContents) {
    deployment.templatesJsonContents.forEach((line, i) => {
      Object.keys(forbidden).forEach((char) => {
        if (line.includes(char)) {
          results.push(forbidden[char](deployment.templatesJsonPath, i + 1));
        }
      });
    });
  }

  return results;
}

module.exports = noForbiddenCharacters;
