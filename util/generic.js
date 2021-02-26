require("../typedefs");
const path = require("path");
const { camelCaseFileName } = require("./text");
const fs = require("fs").promises;
const https = require("https");

const jobdeploy = /^jobdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;

/**
 *
 * @param {Array<string>} fileLines
 *
 * @returns {boolean}
 */
function isAJob(fileLines) {
  const isJobDeploy =
    fileLines.filter((line) => jobdeploy.test(line)).length > 0;
  const isUnpublished =
    fileLines.filter((line) => line === "unpublished").length > 0;

  return isJobDeploy || isUnpublished;
}

/**
 * Read orders, secrets.json, and policy.json from the directory,
 * and split them by \n.
 * @param {String} filePath the path for the orders file
 * @returns {Deployment}
 */
async function getContents(serviceName, filesToCheck) {
  const result = { serviceName };
  for (let filename of filesToCheck) {
    const filepath = path.join(serviceName, filename);
    try {
      await fs.stat(filepath);
      const contents = await fs.readFile(filepath, "utf8");
      result[`${camelCaseFileName(filename)}Path`] = filepath;
      result[`${camelCaseFileName(filename)}Contents`] = contents.split("\n");
    } catch (e) {
      // No particular file is required in order to run the check suite
    }
  }
  return result;
}

function getExportValue(text, varName) {
  const regex = new RegExp(`^export ${varName}=(.*)`, "mi");
  const match = regex.exec(text);

  if (!match || match.length < 2 || match[1].length < 1) return null;

  const value = match[1].replace(/['|"]/gm, "");
  return value && value.length > 0 ? value : null;
}

// No need to pull in axios just  for this
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let data = "";

        // A chunk of data has been received.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Parse it and resolve the promise
        resp.on("end", () => {
          resolve(JSON.parse(data));
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

const secretArn = /arn:([\w\*\-]*):secretsmanager:([\w-]*):(\d*):secret:([\w-\/]+):(\S*?):(\S*?):(\w*)/;
function getSimpleSecret(secret) {
  const match = secretArn.exec(secret);
  if (match) {
    const [ partition, region, account, secretName, jsonKey, versionStage, versionId ] = match.slice(1);
    let arn = `arn:${partition}:secretsmanager:${region}:${account}:secret:${secretName}`;
  
    if (versionId) {
      arn += `-${versionId}`;
    } else {
      arn += "-??????";
    }
  
    return arn;
  }
  
}

function generateSecretsPolicy(secretsJson) {
  const policyDoc = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowSecretsAccess",
        Effect: "Allow",
        Action: "secretsmanager:GetSecretValue",
        Resource: Array.from(
          new Set(secretsJson.map((s) => s.valueFrom).map(getSimpleSecret))
        ),
      },
    ],
  }

  return policyDoc;
}

function getSecretsFromOrders(ordersLines, secretsPrefix) {
  const secretsUse = /^(export +|)(\w+)=\$\(\s*secrets\s*(\w*)\s*\)$/;
  const fromJsonUse = /^export +(\w+)=\$\(\s*fromJson\s+"?\${?(\w+)}?"?\s+"?(\w+)"?\)$/;
  const removeLineSuggestion = "Remove this line\n```suggestion\n```";
  const secrets = [];
  const results = [];

  ordersLines
    .map((line, i) => {
      return { match: secretsUse.exec(line), index: i };
    })
    .filter(({ match }) => match)
    .forEach(
      ({
        match,
        index: i,
      }) => {
        const [, , secretVar, secretName] = match;
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
        ordersLines
          .slice(i + 1) // References to this secret must be below it in the orders file
          .map((line, j) => {
            return { match: fromJsonUse.exec(line), index: i + j + 1 };
          })
          .filter(({ match }) => match)
          .filter(
            ({
              match: [, variable, sourceVar, jsonKey],
            }) => sourceVar === secretVar
          )
          .forEach(
            ({
              match:  [, variable, sourceVar, jsonKey],
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
              secrets.push({ name: variable, value: `${secretsPrefix}${secretName}`, jsonKey })
            }
          );

        if (!hasKeys || ordersLines[i].startsWith("export ")) {
          secrets.push({
            name: secretVar,
            value: `${secretsPrefix}${secretName}`,
          });
        }
      }
    );

  return { secrets, results };
}

module.exports = {
  isAJob,
  getContents,
  getExportValue,
  httpGet,
  generateSecretsPolicy,
  getSimpleSecret,
  getSecretsFromOrders
};
