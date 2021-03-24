require("../typedefs");
const log = require("loglevel");
const path = require("path");
const {
  suggest,
  getLinesForJSON,
  getNewFileLink,
  getOwnerRepoBranch,
  detectIndentation,
  getSecretsFromOrders,
} = require("../util");

const autodeploy = /^autodeploy git@github.com:([\w-]+)\/(.+?)(.git|)#(.+)/;

/**
 * Suggests the use of secrets.json instead of using secrets in orders
 * @param {Deployment} deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 *
 * @returns {Array<Result>}
 */
async function secretsInOrders(deployment, context, inputs) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Secrets in Orders File - ${deployment.ordersPath}`);
  const { awsAccount, secretsPrefix, awsRegion, awsPartition } = inputs;

  /** @type {Array<Result>} */

  const { owner, repo, branch } = getOwnerRepoBranch(context);
  const secretsJsonPath = path.join(deployment.serviceName, "secrets.json");

  const { secrets, results } = getSecretsFromOrders(
    deployment.ordersContents,
    secretsPrefix
  );
  const secretsJson = secrets.map(({ name, value, jsonKey = "" }) => {
    return {
      name,
      valueFrom: `arn:${awsPartition}:secretsmanager:${awsRegion}:${awsAccount}:secret:${value}:${jsonKey}::`,
    };
  });

  if (secretsJson.length === 0) {
    return results;
  }

  // If there's already a secrets.json, we still want to
  // make sure it includes every secret it needs.
  if (deployment.secretsJson) {
    const secretsToAdd = [
      ...difference(
        secretsJson.map(JSON.stringify),
        deployment.secretsJson.map(JSON.stringify)
      ),
    ].map(JSON.parse);
    if (secretsToAdd.length > 0) {
      const result = {
        title: "Missing Secrets in secrets.json",
        path: deployment.secretsJsonPath,
        problems: [],
        level: "failure",
      };

      const { indent } = detectIndentation(deployment.secretsJsonContents);

      // This lets us indent more correctly
      const newSecretsJson = deployment.secretsJson.concat(secretsToAdd);
      const newSecretsLines = JSON.stringify(
        newSecretsJson,
        null,
        indent
      ).split("\n");
      let stringifiedStatement = "";
      secretsToAdd.forEach((secret) => {
        const { start, end } = getLinesForJSON(newSecretsLines, secret);
        stringifiedStatement += `\n${newSecretsLines
          .slice(start - 1, end)
          .join("\n")}`;
      });

      const { end: lineToAnnotate } = getLinesForJSON(
        deployment.secretsJsonContents,
        deployment.secretsJson[deployment.secretsJson.length - 1]
      );

      result.line = lineToAnnotate;

      const oldLine = deployment.secretsJsonContents[lineToAnnotate - 1];
      let newLine = oldLine;
      if (!oldLine.endsWith(",")) {
        newLine += ",";
      }
      newLine += `${stringifiedStatement}`;
      result.problems.push(suggest("Add the following secrets", newLine));

      results.unshift(result);
      deployment.secretsJson = newSecretsJson;
    }
  } else {
    // If there's not already a secrets.json, we should
    // recommend that user create one
    const isAutodeploy =
      deployment.ordersContents.filter((line) => autodeploy.test(line)).length >
      0;
    const level = isAutodeploy ? "warning" : "failure"; // autodeploy doesn't require this
    const secretsFile = JSON.stringify(secretsJson, null, 2);
    results.unshift({
      title: "Create a secrets.json",
      problems: [
        `Add a new file, \`${secretsJsonPath}\`, that contains the following:\n\`\`\`json
${secretsFile}
\`\`\``,
        `[Click to add file](${getNewFileLink({
          owner,
          repo,
          branch,
          filename: secretsJsonPath,
          value: secretsFile,
          type: "new",
        })})`,
      ],
      line: 0,
      level,
    });

    deployment.secretsJson = secretsJson;
  }

  return results;
}

function difference(setA, setB) {
  let _difference = new Set(setA);
  for (let elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
}

module.exports = secretsInOrders;
