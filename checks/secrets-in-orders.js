const core = require("@actions/core");
const path = require("path");
const {
  suggest,
  getLinesForJSON,
  getNewFileLink,
  getOwnerRepoBranch,
} = require("../util");

const secretsUse = /^(export +|)(?<variable>\w+)=\$\(\s*secrets\s*(?<secretName>\w*)\s*\)$/;
const fromJsonUse = /^export +(?<variable>\w+)=\$\(\s*fromJson\s+"?\${?(?<sourceVar>\w+)}?"?\s+"?(?<jsonKey>\w+)"?\)$/;
const autodeploy = /^autodeploy git@github.com:(?<org>[\w-]+)\/(?<repo>.+?)(.git|)#(?<branch>.+)/;
const removeLineSuggestion = "Remove this line\n```suggestion\n```";

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github
 */
async function secretsInOrders(orders, context, inputs) {
  core.info(`Secrets in Orders File - ${orders.path}`);
  const { awsAccount, secretsPrefix, awsRegion } = inputs;
  const results = [];
  const secretsJson = [];

  orders.contents
    .map((line, i) => {
      return { match: secretsUse.exec(line), index: i };
    })
    .filter(({ match }) => match)
    .forEach(
      ({
        match: {
          groups: { variable: secretVar, secretName },
        },
        index: i,
      }) => {
        results.push({
          title: "Deprecated Utility",
          problems: [
            "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
            removeLineSuggestion,
          ],
          line: i + 1,
          level: "warning",
        });

        let hasKeys = false;
        orders.contents
          .slice(i + 1) // References to this secret must be below it in the orders file
          .map((line, j) => {
            return { match: fromJsonUse.exec(line), index: i + j + 1 };
          })
          .filter(({ match }) => match)
          .filter(
            ({
              match: {
                groups: { sourceVar },
              },
            }) => sourceVar === secretVar
          )
          .forEach(
            ({
              match: {
                groups: { variable, jsonKey },
              },
              index: j,
            }) => {
              results.push({
                title: "Deprecated Utility",
                problems: [
                  "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
                  removeLineSuggestion,
                ],
                line: j + 1,
                level: "warning",
              });

              hasKeys = true;
              secretsJson.push({
                name: variable,
                valueFrom: `arn:aws:secretsmanager:${awsRegion}:${awsAccount}:secret:${secretsPrefix}${secretName}:${jsonKey}::`,
              });
            }
          );

        if (!hasKeys || orders.contents[i].startsWith("export ")) {
          secretsJson.push({
            name: secretVar,
            valueFrom: `arn:aws:secretsmanager:${awsRegion}:${awsAccount}:secret:${secretsPrefix}${secretName}:::`,
          });
        }
      }
    );

  if (secretsJson.length === 0) {
    return results;
  }

  // If there's already a secrets.json, we still want to
  // make sure it includes every secret it needs.
  if (orders.secretsJson) {
    const secretsToAdd = [
      ...difference(
        secretsJson.map(JSON.stringify),
        orders.secretsJson.map(JSON.stringify)
      ),
    ].map(JSON.parse);
    if (secretsToAdd.length > 0) {
      const result = {
        title: "Missing Secrets in secrets.json",
        path: orders.secretsPath,
        problems: [],
        level: "failure",
      };

      // This lets us indent more correctly
      const newSecretsJson = orders.secretsJson.concat(secretsToAdd);
      const newSecretsLines = JSON.stringify(newSecretsJson, null, 2).split(
        "\n"
      );
      let stringifiedStatement = "";
      secretsToAdd.forEach((secret) => {
        const { start, end } = getLinesForJSON(newSecretsLines, secret);
        stringifiedStatement += newSecretsLines
          .slice(start - 1, end)
          .join("\n")
          .trim();
      });

      const { end: lineToAnnotate } = getLinesForJSON(
        orders.secretsContents,
        orders.secretsJson[orders.secretsJson.length - 1]
      );

      result.line = lineToAnnotate;

      const oldLine = orders.secretsContents[lineToAnnotate - 1];
      let newLine = oldLine;
      if (!oldLine.endsWith(",")) {
        newLine += ", ";
      }
      newLine += stringifiedStatement;
      result.problems.push(suggest("Add the following secrets", newLine));

      results.push(result);
      orders.secretsJson = newSecretsJson;
    }
  } else {
    // If there's not already a secrets.json, we should
    // recommend that user create one
    const deploymentDir = path.dirname(orders.path);
    const secretsJsonPath = path.join(deploymentDir, "secrets.json");
    const isAutodeploy =
      orders.contents.filter((line) => autodeploy.test(line)).length > 0;
    const level = isAutodeploy ? "warning" : "failure"; // autodeploy doesn't require this
    const { owner, repo, branch } = getOwnerRepoBranch(context);
    const secretsFile = JSON.stringify(secretsJson, null, 2);
    results.push({
      title: "Create a secrets.json",
      problems: [
        `Add a new file, ${secretsJsonPath}, that contains the following:\n\`\`\`json
${secretsFile}
\`\`\``,
        `[Click to add file](${getNewFileLink({
          owner,
          repo,
          branch,
          path: deploymentDir,
          filename: "secrets.json",
          value: secretsFile,
        })})`,
      ],
      line: 0,
      level,
    });

    orders.secretsJson = secretsJson;
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
