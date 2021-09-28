require("../typedefs");
const log = require("loglevel");
const { execFile: execFileCallback } = require("child_process");
const { promisify } = require("util");
const execFile = promisify(execFileCallback);

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function shellcheck(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Orders file is valid bash - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  let results = [];

  const levelsMap = {
    error: "failure",
    warning: "warning",
  };

  try {
    await execFile("shellcheck", [
      deployment.ordersPath,
      "--format",
      "json",
      "--severity",
      "warning",
      "--shell",
      "bash",
    ]);
  } catch (e) {
    const probs = JSON.parse(e.stdout);
    results = probs.map((problem) => ({
      title: "Bash Syntax",
      path: deployment.ordersPath,
      line:
        problem.line === problem.endline
          ? problem.line
          : {
              start: problem.line,
              end: problem.endLine,
            },
      level: levelsMap[problem.level],
      problems: [problem.message],
    }));
  }

  return results;
}

module.exports = shellcheck;
