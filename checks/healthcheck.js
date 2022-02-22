require("../typedefs");
const log = require("loglevel");
const { isAJob } = require("../util");

/**
 * Accepts a deployment object, and validates the healthcheck
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function validateHealthcheck(deployment) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  const problems = [];
  let lineNumber = 0;

  if (isAJob(deployment.ordersContents)) {
    log.info("Jobs do not require a healthcheck, skipping.");
    return [];
  }
  log.info(`Valid Health Check - ${deployment.ordersPath}`);

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];

    if (line.startsWith("export HEALTHCHECK")) {
      const [_, healthcheck] = line.split("=");
      lineNumber = i + 1;

      if (
        healthcheck.length === 0 ||
        healthcheck === '""' ||
        healthcheck === "''"
      ) {
        problems.push("You must set a healthcheck, and it cannot be at `/`");
      }

      if (
        healthcheck === "/" ||
        healthcheck === '"/"' ||
        healthcheck === "'/'"
      ) {
        problems.push(
          `**${healthcheck}** - Your healthcheck cannot be at root.`
        );
      }

      break;
    }
  }

  if (lineNumber === 0) {
    problems.push(
      `**${deployment.ordersPath}** - You must set a healthcheck, and it cannot be at \`/\``
    );
  }

  return [
    {
      title: "Invalid Healthcheck",
      path: deployment.ordersPath,
      problems,
      line: lineNumber,
      level: "failure",
    },
  ];
}

module.exports = validateHealthcheck;
