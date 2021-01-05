require('../typedefs');
const path = require("path");
const core = require("@actions/core");

const validCharacters = /^[a-z][a-z0-9-]*$/;

/**
 * Accepts a deployment object, and validates the name of the service
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function validateServiceName(deployment) {
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  core.info(`Valid Service Name - ${deployment.ordersPath}`);

  const { serviceName } = deployment;

  const problems = [];

  if (serviceName.length > 28) {
    problems.push(
      `**${serviceName}** - Name of service cannot exceed 28 characters.`
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
