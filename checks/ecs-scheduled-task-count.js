require("../typedefs");
const log = require("loglevel");
const { getExportValue } = require("../util");

const limits = {
  lower: 1,
  upper: 50,
};

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function ecsScheduledTaskCount(deployment) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Max ECS Scheduled Task Count - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;

    const taskCount = getExportValue(line, "ECS_SCHEDULED_TASK_COUNT");
    if (
      taskCount &&
      (isNaN(taskCount) ||
        Number(taskCount) > limits.upper ||
        Number(taskCount) < limits.lower)
    ) {
      results.push({
        title: "Invalid Task Count",
        path: deployment.ordersPath,
        level: "failure",
        line: lineNumber,
        problems: [
          `\`ECS_SCHEDULED_TASK_COUNT\` must be a number between **${limits.lower}** and **${limits.upper}**`,
        ],
      });
    }
  });

  return results;
}

module.exports = ecsScheduledTaskCount;
