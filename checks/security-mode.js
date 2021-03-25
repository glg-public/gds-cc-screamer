require("../typedefs");
const log = require("loglevel");
const { isAJob } = require("../util");

/**
 * Validates that the declared security mode matches the cluster type
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 *
 * @returns {Array<Result>}
 */
async function templateCheck(deployment, context) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  if (isAJob(deployment.ordersContents)) {
    log.info("Jobs do not require a security mode, skipping.");
    return [];
  }
  log.info(`Security Mode - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  const expectedModes = getExpectedModes(context);
  const securityMode = getExportValue(
    deployment.ordersContents.join("\n"),
    "SECURITY_MODE"
  );
  if (!securityMode) {
    results.push({
      title: "Missing SECURITY_MODE",
      problems: [
        "`SECURITY_MODE` is missing.\n\nIf this is intentional, add `unpublished` to your orders file.",
      ],
      line: 0,
      level: "failure",
    });
  } else if (expectedModes.indexOf(securityMode) > -1) {
    return [];
  } else {
    deployment.ordersContents.forEach((line, i) => {
      if (line.startsWith("export SECURITY_MODE=")) {
        results.push({
          title: "Invalid SECURITY_MODE",
          problems: [
            `This cluster only supports the following security modes: **${expectedModes.join(
              ", "
            )}**`,
          ],
          line: i + 1,
          level: "failure",
        });
      }
    });
  }

  return results;
}

function getExportValue(text, varName) {
  const regex = new RegExp(`^export ${varName}=(.*)`, "mi");
  const match = regex.exec(text);

  if (!match || match.length < 2 || match[1].length < 1) return null;

  const value = match[1].replace(/['|"]/gm, "");
  return value && value.length > 0 ? value : null;
}

function getExpectedModes(context) {
  const repo = context.payload.pull_request.base.repo.name;
  const splitName = repo.split(".");
  const identifier = splitName[splitName.length - 1].charAt(0);

  const modes = {
    i: ["public"], // this is for internal-only clusters
    s: ["jwt", "verifiedSession", "htpasswd"], // this is for secured clusters
    p: ["public"], // this is for
  };

  return modes[identifier] || [];
}

module.exports = templateCheck;
