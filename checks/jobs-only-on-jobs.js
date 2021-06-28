require("../typedefs");
const log = require("loglevel");
const { getClusterType, isAJob } = require("../util");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function jobsOnlyOnJobs(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Jobs can only be on a Jobs cluster - ${deployment.ordersPath}`);

  const job = isAJob(deployment.ordersContents);
  const clusterType = getClusterType(context);
  if (job && clusterType !== "jobs") {
    return [
      {
        title: "Jobs should only be on Jobs clusters.",
        level: "failure",
        line: 0,
        path: deployment.ordersPath,
        problems: [
          `You are trying to deploy a job on ${
            clusterType === "internal" ? "an" : "a"
          } ${clusterType} cluster. You can only deploy jobs on jobs clusters.`,
        ],
      },
    ];
  } else if (!job && clusterType === "jobs") {
    return [
      {
        title: "Jobs should only be on Jobs clusters.",
        level: "failure",
        line: 0,
        path: deployment.ordersPath,
        problems: [
          `You are trying to deploy a service on a jobs cluster. You can only deploy jobs on jobs clusters.`,
        ],
      },
    ];
  }
}

module.exports = jobsOnlyOnJobs;
