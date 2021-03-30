require("../typedefs");
const log = require("loglevel");
const { getLineWithinObject } = require("../util");

const secretArn = /arn:([\w\*\-]*):secretsmanager:([\w-]*):(\d*):secret:([\w\-\/]*):?([^\s:]*):?([^\s:]*):?(\w*)/;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function secretsExist(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.secretsJson) {
    log.info(`No/invalid secrets.json - Skipping ${deployment.serviceName}`);
    return [];
  }
  if (!inputs.deployinatorURL || !inputs.deployinatorToken) {
    log.info("No Deployinator Config, Skipping");
  }
  log.info(`Secrets Exist - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  const httpOpts = {
    headers: {
      Authorization: `Bearer ${inputs.deployinatorToken}`,
    },
  };
  const secretsURL = `${inputs.deployinatorURL}/enumerate/secrets`;
  let secretNames;
  try {
    const allSecrets = await httpGet(secretsURL, httpOpts);
    secretNames = new Set(allSecrets.map(({ name }) => name));
  } catch (e) {
    log.info("Could not connect to deployinator for secrets validation.");
    return [];
  }

  deployment.secretsJson.forEach((secret) => {
    const match = secretArn.exec(secret.valueFrom);
    if (match) {
      const [
        ,
        partition,
        region,
        accountId,
        value,
        jsonKey,
        versionStage,
        versionId,
      ] = match;
      if (!secretNames.has(value)) {
        const regex = new RegExp(`"valueFrom":\\s*"${secret.valueFrom}"`);
        const line = getLineWithinObject(
          deployment.secretsJsonContents,
          secret,
          regex
        );
        results.push({
          title: "Secret Could Not Be Found",
          level: "warning",
          line,
          path: deployment.secretsJsonPath,
          problems: [`The following secret could not be found: \`${value}\``],
        });
      }
    }
  });

  return results;
}

module.exports = secretsExist;
