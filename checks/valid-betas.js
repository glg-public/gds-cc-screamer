require("../typedefs");
const log = require("loglevel");
const { getExportValue, suggest } = require("../util");
const fs = require("fs").promises;
const path = require("path");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function validBetas(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Valid Betas - ${deployment.ordersPath}`);

  const clusterDeployments = new Set(
    await getAllCCDeployments(inputs.clusterRoot)
  );

  function normalizePath(betaPath) {
    if (betaPath.startsWith("/")) return betaPath;
    else return `/${betaPath}`;
  }

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;
    const pathOfNonBetaVersion = getExportValue(
      line,
      "PATH_OF_NON_BETA_VERSION"
    );
    if (pathOfNonBetaVersion) {
      if (!pathOfNonBetaVersion.startsWith("/")) {
        return results.push({
          title: "PATH_OF_NON_BETA_VERSION must start with a `/`",
          level: "failure",
          line: lineNumber,
          path: deployment.ordersPath,
          problems: [
            suggest(
              "Add a leading `/`",
              line.replace(
                pathOfNonBetaVersion,
                normalizePath(pathOfNonBetaVersion)
              )
            ),
          ],
        });
      }
      const nonBetaSplit = pathOfNonBetaVersion.split(",");
      if (nonBetaSplit.length > 1) {
        return results.push({
          title: "PATH_OF_NON_BETA_VERSION must be a single path",
          level: "failure",
          line: lineNumber,
          path: deployment.ordersPath,
          problems: [
            suggest(
              "Only provide one path",
              line.replace(pathOfNonBetaVersion, nonBetaSplit[0])
            ),
          ],
        });
      }
      if (!clusterDeployments.has(pathOfNonBetaVersion.substring(1))) {
        return results.push({
          title:
            "PATH_OF_NON_BETA_VERSION must reference an existing deployment",
          level: "failure",
          line: lineNumber,
          path: deployment.ordersPath,
          problems: [
            `Service \`${pathOfNonBetaVersion}\` does not exist in this cluster config`,
          ],
        });
      }
    }
    const pathsOfOtherBetas = getExportValue(line, "PATHS_OF_OTHER_BETAS");
    if (pathsOfOtherBetas) {
      const otherBetasSplit = pathsOfOtherBetas.split(",");
      for (let betaPath of otherBetasSplit) {
        if (!betaPath.startsWith("/")) {
          return results.push({
            title: "PATHS_OF_OTHER_BETAS must start with a `/`",
            level: "failure",
            line: lineNumber,
            path: deployment.ordersPath,
            problems: [
              suggest(
                "Add a leading `/`",
                line.replace(
                  pathsOfOtherBetas,
                  otherBetasSplit.map(normalizePath).join(",")
                )
              ),
            ],
          });
        }
        if (!clusterDeployments.has(betaPath.substring(1))) {
          return results.push({
            title:
              "PATHS_OF_OTHER_BETAS must reference only existing deployments",
            level: "failure",
            line: lineNumber,
            path: deployment.ordersPath,
            problems: [
              `Service \`${betaPath}\` does not exist in this cluster config`,
            ],
          });
        }
      }
    }
  });

  return results;
}

async function getAllCCDeployments(clusterRoot) {
  const services = [];
  try {
    const files = await fs.readdir(clusterRoot, { withFileTypes: true });
    const directories = files.filter((file) => file.isDirectory());
    await Promise.all(
      directories.map(async (dir) => {
        const ordersPath = path.join(clusterRoot, dir.name, "orders");
        try {
          await fs.stat(ordersPath);
          services.push(dir.name);
        } catch (err) {
          // not important
        }
      })
    );
  } catch (e) {
    console.error(e);
  }
  return services;
}

module.exports = validBetas;
