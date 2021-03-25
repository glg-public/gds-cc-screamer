require("../typedefs");
const log = require("loglevel");
const { getExportValue, suggest, getAccess } = require("../util");

/**
 * Requires the use of | instead of + to combine jwt access flags
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function jwtAccessFlags(deployment, context, inputs, httpGet) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`JWT Access Flags - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  let lineNumber;
  let accessFlags;
  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];
    const jwtFlags = getExportValue(line, "JWT_ACCESS_FLAGS");
    const sessionFlags = getExportValue(line, "SESSION_ACCESS_FLAGS");
    accessFlags = sessionFlags || jwtFlags;
    if (accessFlags) {
      lineNumber = i + 1;
    }
    if (accessFlags && accessFlags.includes("+")) {
      results.push({
        title: `Syntax Error in ${
          sessionFlags ? "SESSION" : "JWT"
        }_ACCESS_FLAGS`,
        problems: [suggest("Use a `|` instead", line.replace(/\+/g, "|"))],
        line: lineNumber,
        level: "failure",
      });
      break;
    }
  }

  if (inputs.deployinatorToken && inputs.deployinatorURL) {
    const httpOpts = {
      headers: {
        Authorization: `Bearer ${inputs.deployinatorToken}`,
      },
    };
    const rolesURL = `${inputs.deployinatorURL}/enumerate/roles`;
    let roles;
    try {
      roles = await httpGet(rolesURL, httpOpts);
      try {
        const access = getAccess(deployment.ordersContents.join("\n"), roles);
        if (!access) {
          results.push({
            title: "Public Deployments do not need access controls",
            level: "warning",
            line: lineNumber,
            path: deployment.ordersPath,
            problems: [
              "Your security mode is set to `public`, but you have defined access controls.",
            ],
          });
        }
      } catch ({ unknownRoles, allClaims }) {
        const supportClaims = `Your access flags include the following claims: ${allClaims
          .map((role) => `\`${role}\``)
          .join(", ")}`;
        results.push({
          title: "Unknown Role",
          level: "failure",
          line: lineNumber,
          path: deployment.ordersPath,
          problems: [
            supportClaims,
            ...unknownRoles.map((role) => `**Unknown Claim**: \`${role}\``),
          ],
        });
      }
    } catch (e) {
      results.push({
        title: `Could not fetch roles`,
        level: "warning",
        line: 0,
        path: deployment.ordersPath,
        problems: [
          "This most likely implies an incorrectly configured connection to Deployinator",
        ],
      });
      return results;
    }
  }

  return results;
}

module.exports = jwtAccessFlags;
