require("../typedefs");
const log = require("loglevel");

/**
 * Accepts a deployment object, and checks that if ENTRYPOINT is used, CMD is also
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function entrypointRequiresCmd(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`ENTRYPOINT Requires CMD - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  let hasCmd = false;
  let hasEntrypoint = false;
  let entrypointLineNo = 0;
  deployment.ordersContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;
    // this test only checks CMD and ENTRYPOINT values
    hasCmd = /export\s+CMD/.test(line) || hasCmd;
    const thisLineHasEntrypoint = /export\s+ENTRYPOINT/.test(line)
    hasEntrypoint = thisLineHasEntrypoint || hasEntrypoint;
    if (thisLineHasEntrypoint) {
      entrypointLineNo = lineNumber;
    }

  });

  if (hasEntrypoint && !hasCmd) {
    results.push({
      title: `ENTRYPOINT requires CMD`,
      problems: [
        `Using ENTRYPOINT to override the docker image requires that you also override CMD.\nSee https://docs.docker.com/engine/reference/run/#entrypoint-default-command-to-execute-at-runtime`
      ],
      line: entrypointLineNo,
      level: "failure",
    });
  }

  return results;
}

module.exports = entrypointRequiresCmd;
