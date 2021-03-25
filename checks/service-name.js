require("../typedefs");
const path = require("path");
const log = require("loglevel");

const validCharacters = /^[a-z][a-z0-9-]*$/;

/**
 * Validates the name of service for length and characters
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function validateServiceName(deployment) {
  log.info(`Valid Service Name - ${deployment.serviceName}`);

  const { serviceName } = deployment;

  const problems = [];

  if (serviceName.length > 28) {
    problems.push(
      `**${serviceName}** - Name of service cannot exceed 28 characters (currently ${serviceName.length} characters).`
    );
  }

  if (!validCharacters.test(serviceName)) {
    problems.push(
      `**${serviceName}** - Service name must only contain lowercase alphanumeric characters and hyphens.`
    );
  }

  if (serviceName.includes("--")) {
    problems.push(`**${serviceName}** - Service name cannot include \`--\`.`);
  }

  return [
    {
      title: "Invalid Service Name",
      problems,
      line: 0,
      level: "failure",
    },
  ];
}

module.exports = validateServiceName;
