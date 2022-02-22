require("../typedefs");
const log = require("loglevel");
const { getExportValue } = require("../util");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function fqdnLock(deployment, context, inputs, httpGet) {
  if (!inputs.fqdnLocks || inputs.fqdnLocks.size === 0) {
    log.info(`No FQDN Locks configured. Skipping.`);
    return [];
  }

  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  log.info(`FQDN Lock - ${deployment.ordersPath}`);

  const fqdn = getExportValue(deployment.ordersContents.join("\n"), "GDS_FQDN");
  if (inputs.fqdnLocks.has(fqdn)) {
    return [
      {
        title: "Deployment Locked",
        path: deployment.ordersPath,
        level: "failure",
        line: 0,
        problems: [
          `Changes to services using **${fqdn}** have been locked in this cluster. This is most likely because they are actively being migrated to a different cluster.`,
        ],
      },
    ];
  }

  return [];
}

module.exports = fqdnLock;
