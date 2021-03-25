require("../typedefs");
const log = require("loglevel");
const { isAJob, suggest } = require("../util");

const envvar = /^(export |)(\w+)=['"]?(.+?)['"]?$/;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function fqdnRequired(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  if (isAJob(deployment.ordersContents)) {
    log.info(`Jobs don't need domains - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`GDS_FQDN is set - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  const repo = context.payload.pull_request.base.repo.name;
  const splitName = repo.split(".");
  const repoCluster = splitName.pop();
  const clusterMap = await httpGet(inputs.clusterMap);

  let myCluster = { hosts: [] };
  if (clusterMap[repoCluster]) {
    myCluster = clusterMap[repoCluster];
  }
  if (!myCluster.hosts) {
    myCluster.hosts = [];
  }

  let isSet = false;
  let lastEnvLine = 1;
  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;
    const match = envvar.exec(line);
    if (match) {
      const [, , variable, value] = match;
      if (!["SECURITY_MODE", "SESSION_ACCESS_FLAGS"].includes(variable)) {
        lastEnvLine = lineNumber;
      }

      if (variable === "GDS_FQDN") {
        isSet = true;
        if (myCluster.hosts.length > 0 && !myCluster.hosts.includes(value)) {
          const result = {
            title: "You Must Specify A Valid Domain Name For This Cluster",
            level: "failure",
            problems: [],
            path: deployment.ordersPath,
            line: lineNumber,
          };
          result.problems.push(
            `Like one of the following:\n${myCluster.hosts
              .map((host) => suggest("", line.replace(value, host)))
              .join("\n")}`
          );
          results.push(result);
        } else if (myCluster.hosts.length === 0) {
          results.push({
            title: "This Cluster Does Not Have Any Associated Hostnames",
            level: "warning",
            problems: [
              "It is likely that your service will not be reachable at this address, as there are currently no domains associated with this cluster.",
            ],
            path: deployment.ordersPath,
            line: lineNumber,
          });
        }
      }
    }
  });

  if (!isSet) {
    const result = {
      title: "You Must Specify a Preferred Domain Name",
      level: "failure",
      problems: [],
      path: deployment.ordersPath,
      line: lastEnvLine,
    };

    if (myCluster.hosts.length === 0) {
      result.problems.push("(e.g. `streamliner.glgresearch.com`)");
    } else {
      result.problems.push(
        `Like one of the following:\n${myCluster.hosts
          .map((host) =>
            suggest(
              "",
              `${
                deployment.ordersContents[result.line - 1] || ""
              }\n\n# Preferred Fully Qualified Domain Name\nexport GDS_FQDN='${host}'\n`
            )
          )
          .join("\n")}`
      );
    }

    results.push(result);
  }

  return results;
}

module.exports = fqdnRequired;
