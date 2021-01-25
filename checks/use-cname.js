require("../typedefs");
const core = require("@actions/core");

const envvar = /^(export |)(?<variable>\w+)=['"]?(?<value>.+?)['"]?$/;
const clusterDNS = /^https:\/\/(?<clusterId>[spji]\d\d)\.glgresearch\.com/;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function useCNAME(deployment, context, inputs) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`Use CNAME instead of cluster DNS - ${deployment.ordersPath}`);
  const results = [];
  /**
   * A Result Object:
   {
    title: 'Failing Check',
    problems: ['This code sucks'],
    line: lineNumber,
    level: 'failure' // must be "failure", "warning", "notice", or "success"
    [path]: deployment.secretsJsonPath // This defaults to the deployment path, but you can override for different files.
   }
   */

  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;
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
          problems: [
            `Rather than using the cluster dns (\`${clusterId}.glgresearch.com\`), consider using the friendly CNAME (e.g. \`streamliner.glgresearch.com\`)`,
          ],
        };
        results.push(result);
      }
    }
  });

  return results;
}

module.exports = useCNAME;
