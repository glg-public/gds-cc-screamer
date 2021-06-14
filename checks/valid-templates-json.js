require("../typedefs");
const log = require("loglevel");
const {
  codeBlock,
  getLineNumber,
  escapeRegExp,
  compareSecurity,
  getMasks,
  getAccess,
  getExportValue,
} = require("../util");

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function validTemplatesJson(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.templatesJsonContents) {
    log.info(`No templates.json Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`templates.json is valid - ${deployment.templatesJsonPath}`);

  /** @type {Array<Result>} */
  const results = [];

  try {
    deployment.templatesJson = JSON.parse(
      deployment.templatesJsonContents.join("\n")
    );
  } catch (e) {
    results.push({
      title: "templates.json is invalid JSON",
      level: "warning",
      line: 0,
      problems: [
        "`templates.json` file could not be parsed as valid JSON",
        codeBlock(e, "shell"),
      ],
      path: deployment.templatesJsonPath,
    });
    return results;
  }

  if (!Array.isArray(deployment.templatesJson.secure)) {
    results.push({
      title: "templates.json - syntax error",
      level: "warning",
      line: 1,
      problems: [
        '`templates.json` must be a JSON object like `{"secure": [<templateNames>]}`',
      ],
      path: deployment.templatesJsonPath,
    });
    return results;
  }

  const orders = deployment.ordersContents.join("\n");

  const securityMode = getExportValue(orders, "SECURITY_MODE");
  if (
    (securityMode === "public" || !securityMode) &&
    deployment.templatesJson.secure.length > 0
  ) {
    results.push({
      title: "Public App with Secure Templates",
      line: 0,
      level: "warning",
      path: deployment.templatesJsonPath,
      problems: [
        `Your app lacks access controls, which means browser requests will be made unauthenticated. However, you have specified **${deployment.templatesJson.secure.length}** template(s) as being secure. Your users may not be able to access these templates without authentication.`,
      ],
    });
    return results;
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
      const { data } = await httpGet(rolesURL, httpOpts);
      roles = data;
    } catch ({ error, statusCode }) {
      if (statusCode === 401) {
        results.push({
          title: "401 From Deployinator API",
          level: "notice",
          line: 0,
          path: deployment.templatesJsonPath,
          problems: [
            "CC Screamer received a 401 from the Deployinator API. This most likely indicates an expired or invalid app token.",
          ],
        });
        return results;
      } else {
        throw new Error(error);
      }
    }
    let access;
    try {
      access = getAccess(orders, roles);
    } catch (e) {
      results.push({
        title: "Cannot Check Template Access Controls",
        line: 0,
        level: "warning",
        path: deployment.templatesJsonPath,
        problems: [
          `Your app has invalid access controls, so templates cannot be checked.`,
        ],
      });
      return results;
    }
    if (!access) {
      results.push({
        title: "No Access Flags with Secure Templates",
        line: 0,
        level: "warning",
        path: deployment.templatesJsonPath,
        problems: [
          `Your app has not defined any access controls. However, you have specified **${deployment.templatesJson.secure.length}** template(s) as being secure. Your users may not be able to access these templates without proper authentication.`,
        ],
      });
      return results;
    }
    await Promise.all(
      deployment.templatesJson.secure.map(async (templateName, i) => {
        const frontMatterURL = `${inputs.deployinatorURL}/template/security/${templateName}`;
        const regex = new RegExp(escapeRegExp(templateName));
        const lineNumber = getLineNumber(
          deployment.templatesJsonContents,
          regex
        );
        try {
          const { data: frontMatter } = await httpGet(frontMatterURL, httpOpts);
          const expected = getMasks(access, roles).masks;
          const securityMatches = compareSecurity(
            expected,
            frontMatter.executionMasks
          );
          if (!securityMatches) {
            results.push({
              title: "Template Security Does Not Match App Security",
              line: lineNumber,
              level: "warning",
              problems: [
                "> Note: `role-glg` and `jwt-role-glg` are equivalent for this case.",
                `Template \`${templateName}\` expects the following masks: \`${JSON.stringify(
                  frontMatter.executionMasks
                )}\``,
                `Your app has the following masks: \`${JSON.stringify(
                  expected
                )}\``,
              ],
              path: deployment.templatesJsonPath,
            });
          }
        } catch (e) {
          results.push({
            title: `${templateName} could not be found.`,
            level: "warning",
            line: lineNumber,
            path: deployment.templatesJsonPath,
            problems: [
              `The specified template \`${templateName}\` could not be found.`,
              "This can happen for several reasons, including a bad connection to Deployinator.",
            ],
          });
        }
      })
    );
  }

  return results;
}

module.exports = validTemplatesJson;
