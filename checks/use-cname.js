require("../typedefs");
const log = require("loglevel");
const { suggest } = require("../util");

const envvar = /^(export |)(?<variable>\w+)=['"]?(?<value>.+?)['"]?$/;
const clusterDNS = /^https:\/\/(?<clusterId>[spji]\d\d)\.glgresearch\.com/;

/**
 * Throws a warning when it detects the use of cluster dns instead of a friendly cname
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function useCNAME(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  if (!inputs.deployinatorURL || !inputs.deployinatorToken) {
    log.info("No Deployinator Config, Skipping");
    return [];
  }
  log.info(`Use CNAME instead of cluster DNS - ${deployment.ordersPath}`);
  /** @type {Array<Result>} */
  const results = [];

  const repo = context.payload.pull_request.base.repo.name;
  const splitName = repo.split(".");
  const repoCluster = splitName.pop();

  let lineNumber;
  try {
    const httpOpts = {
      headers: {
        Authorization: `Bearer ${inputs.deployinatorToken}`,
      },
    };
    const clusterMapURL = `${inputs.deployinatorURL}/cluster-map.json?bust=true`;
    const { data: clusterMap } = await httpGet(clusterMapURL, httpOpts);

    let myCluster = { hosts: [] };
    if (clusterMap[repoCluster]) {
      myCluster = clusterMap[repoCluster];
    }
    if (!myCluster.hosts) {
      myCluster.hosts = [];
    }

    deployment.ordersContents.forEach((line, i) => {
      lineNumber = i + 1;
      const envvarMatch = envvar.exec(line);
      if (envvarMatch) {
        const { value } = envvarMatch.groups;

        const clusterDNSMatch = clusterDNS.exec(value);
        if (clusterDNSMatch) {
          const { clusterId } = clusterDNSMatch.groups;
          const result = {
            title: "Use friendly CNAME instead",
            line: lineNumber,
            level: "warning",
            path: deployment.ordersPath,
            problems: [],
          };

          const msg = `Rather than using the cluster dns (\`${clusterId}.glgresearch.com\`), consider using a friendly CNAME`;

          if (myCluster.hosts.length === 0) {
            result.problems.push(
              `${msg} (e.g. \`streamliner.glgresearch.com\`)`
            );
          } else {
            result.problems.push(
              `${msg} like one of the following:\n${myCluster.hosts
                .map((host) =>
                  suggest(
                    "",
                    line.replace(`${clusterId}.glgresearch.com`, host)
                  )
                )
                .join("\n")}`
            );
          }
          results.push(result);
        }
      }
    });
    return results;
  } catch ({ error, statusCode }) {
    if (statusCode === 401) {
      return [
        {
          title: "Internal Server Error",
          level: "notice",
          line: lineNumber ?? 0,
          problems: [
            "CC Screamer received a 401 from the Deployinator API. This most likely indicates an expired or invalid app token.",
          ],
        },
      ];
    } else if (statusCode >= 500) {
      return [
        {
          title: "Internal Server Error",
          level: "notice",
          line: lineNumber ?? 0,
          problems: [
            "An unknown error was encountered while accessing the Deployinator API. Please manually confirm that your access flags are valid",
          ],
        },
      ];
    } else {
      log.error(JSON.stringify({ statusCode, error }));
      throw new Error(error);
    }
  }
}

module.exports = useCNAME;
