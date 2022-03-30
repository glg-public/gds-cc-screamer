require("../typedefs");
const log = require("loglevel");
const { getExportValue, getLineNumber, suggest, isAJob } = require("../util");
const cronstrue = require("cronstrue");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function validateCron(deployment) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  const cronStatement = getExportValue(
    deployment.ordersContents.join("\n"),
    "ECS_SCHEDULED_TASK_CRON"
  );
  if (!cronStatement && !isAJob(deployment.ordersContents)) {
    log.info(`No Cron Statement - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Validate Cron Statement - ${deployment.ordersPath}`);
  if (!cronStatement && isAJob(deployment.ordersContents)) {
    return [
      {
        title: "Jobs must define a cron statement",
        level: "failure",
        line: 0,
        path: deployment.ordersContents,
        problems: [
          "Your job must define a valid cron schedule in the environment variable `ECS_SCHEDULED_TASK_CRON`",
        ],
      },
    ];
  }

  /** @type {Array<Result>} */
  const results = [];

  const lineRegex = /^export ECS_SCHEDULED_TASK_CRON=/;
  const line = getLineNumber(deployment.ordersContents, lineRegex);

  let comment;
  try {
    comment = `# ${cronstrue.toString(cronStatement)} (UTC)`;
  } catch (e) {
    results.push({
      title: "Invalid Cron Statement",
      level: "failure",
      path: deployment.ordersPath,
      line,
      problems: [e.toString()],
    });
    return results;
  }

  const newComment = {
    title: "Add A Comment",
    level: "notice",
    path: deployment.ordersPath,
    line: line - 1,
    problems: [suggest("Consider Adding A Comment", `\n${comment}`)],
  };

  const updateComment = {
    title: "Update This Comment",
    level: "notice",
    path: deployment.ordersPath,
    line: line - 1,
    problems: [suggest("Update This Comment", comment)],
  };

  if (line >= 2) {
    const commentLine = deployment.ordersContents[line - 2];
    if (/^\s*$/.test(commentLine) || !commentLine.startsWith("#")) {
      results.push(newComment);
    } else if (commentLine != comment) {
      results.push(updateComment);
    }
  } else {
    results.push({
      ...newComment,
      line,
      problems: [
        suggest(
          "Consider Adding A Comment",
          `${comment}\n${deployment.ordersContents[line - 1]}`
        ),
      ],
    });
  }

  return results;
}

module.exports = validateCron;
