require("../typedefs");
const core = require("@actions/core");
const { getLineWithinObject } = require("../util");

const reservedInOrders = new Set(["JWT_SECRET"]);
const reservedInSecrets = new Set([
  "CMD",
  "ECS_SCHEDULED_TASK_COUNT",
  "ECS_SCHEDULED_TASK_CRON",
  "ECS_TASK_CPU",
  "ECS_TASK_COUNT",
  "ECS_TASK_MAX_CAPACITY",
  "ECS_TASK_MIN_CAPACITY",
  "ECS_TASK_MEMORY_RESERVATION_IN_MB",
  "ECS_TASK_SCALE_IN_COOLDOWN_IN_SECONDS",
  "ECS_TASK_SCALE_OUT_COOLDOWN_IN_SECONDS",
  "ECS_TASK_SCALING_TARGET_VALUE_PERCENT",
  "GDS_FQDN",
  "HEALTHCHECK",
  "HEALTHCHECK_GRACE_PERIOD_SECONDS",
  "JWT_SECRET",
  "SESSION_REVOCATION_DIR",
  "SESSION_PRIVATE_KEY",
  "SESSION_PUBLIC_KEY_CURRENT",
  "SESSION_PUBLIC_KEY_OLD",
  "SESSION_AUTH_SITE",
  "USER_IDENTITY_HEADER",
  "SESSION_COOKIE_NAME",
  "SESSION_ACCESS_FLAGS",
  "SESSION_MAX_TOKEN_AGE_IN_SECONDS",
  "SESSION_EXPIRATION_IN_SECONDS",
  "TARGET_GROUP_HEALTHCHECK_HEALTHY_THRESHOLD",
  "TARGET_GROUP_HEALTHCHECK_INTERVAL_SECONDS",
  "TARGET_GROUP_HEALTHCHECK_STATUS_CODES",
  "TARGET_GROUP_HEALTHCHECK_TIMEOUT_SECONDS",
  "TARGET_GROUP_HEALTHCHECK_UNHEALTHY_THRESHOLD",
]);

const envvar = /^(export |)(\w+)=.+/;

/**
 * Accepts a deployment object, and verified that it does not contain reserved variables
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function noReservedVars(deployment) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.ordersContents) {
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`No Reserved Variables - ${deployment.serviceName}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;

    const match = envvar.exec(line);
    if (match) {
      const variable = match[2];
      if (reservedInOrders.has(variable)) {
        results.push({
          title: "No Reserved Variables",
          path: deployment.ordersPath,
          level: "failure",
          line: lineNumber,
          problems: [
            `\`${variable}\` is a reserved variable name in GDS. You will need to rename this variable.`,
          ],
        });
      }
    }
  });

  if (deployment.secretsJson) {
    deployment.secretsJson.forEach((secret) => {
      if (reservedInSecrets.has(secret.name)) {
        const regex = new RegExp(`"name":\\s*"${secret.name}"`);
        const lineNumber = getLineWithinObject(
          deployment.secretsJsonContents,
          secret,
          regex
        );
        results.push({
          title: "No Reserved Variables",
          path: deployment.secretsJsonPath,
          level: "failure",
          line: lineNumber,
          problems: [
            `\`${secret.name}\` is a reserved variable name in GDS. You will need to rename this variable.`,
          ],
        });
      }
    });
  }

  return results;
}

module.exports = noReservedVars;
