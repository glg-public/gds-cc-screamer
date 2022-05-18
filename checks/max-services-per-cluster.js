require("../typedefs");
const log = require("loglevel");
const path = require("path");
const fs = require("fs").promises;
const { getClusterType, isAJob } = require("../util");

const checkName = "Max Services Per Cluster";

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function maxServicesPerCluster(deployment, context, inputs) {
  const clusterType = getClusterType(context);
  if (!deployment.ordersContents) {
    log.info(`No Orders File - Skipping ${checkName}`);
    return [];
  }
  if (clusterType === "jobs" || isAJob(deployment.ordersContents)) {
    log.info(`Job - Skipping Check: ${checkName}`);
    return [];
  }
  log.info(`${checkName} - ${deployment.serviceName}`);

  const { numServicesWarnThreshold, numServicesFailThreshold, clusterRoot } =
    inputs;

  const numServices = await getNumServices(clusterRoot);

  if (numServices < numServicesWarnThreshold) {
    return [];
  }

  if (numServices <= numServicesFailThreshold) {
    return [
      {
        title: "Approaching Service Number Limit",
        problems: [
          `Including \`/${deployment.serviceName}\`, this cluster has ${numServices} services out of ${numServicesFailThreshold} allowed.  [Reason: AWS Quotas](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html)`,
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
        `This cluster supports a maximum of ${numServicesFailThreshold} services. (Currently **${numServices}** services, including \`/${deployment.serviceName}\`). [Reason: AWS Quotas](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html)`,
      ],
      level: "failure",
      line: 0,
    },
  ];
}

async function getNumServices(clusterRoot) {
  try {
    const files = await fs.readdir(clusterRoot, { withFileTypes: true });
    const directories = files.filter((file) => file.isDirectory());
    let numServices = 0;
    await Promise.all(
      directories.map(async (dir) => {
        const ordersPath = path.join(clusterRoot, dir.name, "orders");
        try {
          const orders = await fs.readFile(ordersPath, "utf8");
          // We don't need to count jobs
          if (!isAJob(orders.split("\n"))) {
            numServices += 1;
          }
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
