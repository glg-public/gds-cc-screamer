require("../typedefs");
const log = require("loglevel");
const { getExportValue, suggest, getAccess } = require("../util");

/**
 * Requires the use of | instead of + to combine jwt access flags
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
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
  const securityMode = getExportValue(
    deployment.ordersContents.join("\n"),
    "SECURITY_MODE"
  );
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
    try {
      const { data: roles } = await httpGet(rolesURL, httpOpts);
      try {
        const access = getAccess(deployment.ordersContents.join("\n"), roles);
        if (access && securityMode === "public") {
          results.push({
            title: "Public Deployments do not need access controls",
            level: "warning",
            line: lineNumber,
            path: deployment.ordersPath,
            problems: [
              "Your security mode is set to `public`, but you have defined access controls.",
              "[More About Access Controls](https://services.glgresearch.com/know/glg-deployment-system-gds/access-control/)",
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
            "[More About Access Controls](https://services.glgresearch.com/know/glg-deployment-system-gds/access-control/)",
          ],
        });
      }
    } catch ({ error, statusCode }) {
      if (statusCode === 401) {
        return [
          {
            title: "401 From Deployinator API",
            level: "notice",
            line: 0,
            problems: [
              "CC Screamer received a 401 from the Deployinator API. This most likely indicates an expired or invalid app token.",
            ],
            path: deployment.ordersPath,
          },
        ];
      } else {
        throw new Error(error);
      }
    }
  }

  return results;
}

module.exports = jwtAccessFlags;
