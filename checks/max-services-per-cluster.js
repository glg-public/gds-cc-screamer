require("../typedefs");
const core = require("@actions/core");
const path = require("path");
const fs = require("fs").promises;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function maxServicesPerCluster(deployment, context, inputs) {
  console.log(`Max Services Per Cluster - ${deployment.serviceName}`);

  const {
    numServicesWarnThreshold,
    numServicesFailThreshold,
    clusterRoot,
  } = inputs;

  const numDeployments = await getNumDeployments(clusterRoot);

  if (numDeployments < numServicesWarnThreshold) {
    return [];
  }

  if (numDeployments <= numServicesFailThreshold) {
    return [
      {
        title: "Approaching Service Number Limit",
        problems: [
          `Including this deployment, this cluster has ${numDeployments} services out of ${numServicesFailThreshold} allowed.`,
        ],
        level: "warning",
        line: 0,
      },
    ];
  }

  return [
    {
      title: "Too Many Services In This Cluster",
      problems: [
        `This cluster supports a maximum of ${numServicesFailThreshold} services. (Currently **${numDeployments}** services, including this one)`,
      ],
      level: "failure",
      line: 0,
    },
  ];
}

async function getNumDeployments(clusterRoot) {
  try {
    const files = await fs.readdir(clusterRoot, { withFileTypes: true });
    const directories = files.filter((file) => file.isDirectory());
    let numServices = 0;
    await Promise.all(
      directories.map(async (dir) => {
        const ordersPath = path.join(clusterRoot, dir.name, "orders");
        try {
          await fs.stat(ordersPath);
          numServices += 1;
        } catch (err) {
          // not important
        }
      })
    );
    return numServices;
  } catch (e) {
    console.error(e);
  }
  return -1;
}

module.exports = maxServicesPerCluster;
