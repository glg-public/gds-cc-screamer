require("../typedefs");
const path = require("path");
const { camelCaseFileName } = require("./text");
const fs = require("fs").promises;
const https = require("https");

const jobdeploy = /^jobdeploy\s+(\w+)\/([\w-]+)\/(.+?)\/([^:]+):?(\w*)/;

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

function isChinaClusterConfig(context) {
  const repo = context.payload.pull_request.base.repo.name;
  return repo.startsWith("gds.china.");
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

  const value = match[1].replace(/['"]/gm, "");
  return value && value.length > 0 ? value : null;
}

// No need to pull in axios just  for this
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, options, (resp) => {
        let data = "";

        // A chunk of data has been received.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Parse it and resolve the promise
        resp.on("end", () => {
          try {
            const retValue = JSON.parse(data);
            if (resp.statusCode >= 400) {
              reject({ data: retValue, statusCode: resp.statusCode });
            } else {
              resolve({ data: retValue, statusCode: resp.statusCode });
            }
          } catch (error) {
            reject({ data, error, statusCode: resp.statusCode });
          }
        });
      })
      .on("error", (error) => {
        reject({ data, error, statusCode: resp.statusCode });
      });
  });
}

const secretArn =
  /arn:([\w\*\-]*):secretsmanager:([\w-]*):(\d*):secret:([\w\-\/]*):?([^\s:]*):?([^\s:]*):?(\w*)/;
function getSimpleSecret(secret) {
  const match = secretArn.exec(secret);
  if (match) {
    const [
      partition,
      region,
      account,
      secretName,
      jsonKey,
      versionStage,
      versionId,
    ] = match.slice(1);
    let arn = `arn:${partition}:secretsmanager:${region}:${account}:secret:${secretName}`;

    // If it already ends in a version ID, just return as is.
    if (/\-\w{6}$/.test(secretName)) {
      return arn;
    }

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
  };

  return policyDoc;
}

function getClusterType(context) {
  const repo = context.payload.pull_request.base.repo.name;
  const splitName = repo.split(".");
  const identifier = splitName[splitName.length - 1].charAt(0);
  return {
    i: "internal",
    s: "secure",
    p: "public",
    j: "jobs",
  }[identifier];
}

function getSecretsFromOrders(ordersLines, secretsPrefix) {
  const secretsUse = /^(export +|)(\w+)=\$\(\s*secrets\s*(\w*)\s*\)$/;
  const fromJsonUse =
    /^export +(\w+)=\$\(\s*fromJson\s+"?\${?(\w+)}?"?\s+"?(\w+)"?\)$/;
  const removeLineSuggestion = "Remove this line\n```suggestion\n```";
  const secrets = [];
  const results = [];

  ordersLines
    .map((line, i) => {
      return { match: secretsUse.exec(line), index: i };
    })
    .filter(({ match }) => match)
    .forEach(({ match, index: i }) => {
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
          ({ match: [, variable, sourceVar, jsonKey] }) =>
            sourceVar === secretVar
        )
        .forEach(({ match: [, variable, sourceVar, jsonKey], index: j }) => {
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
          secrets.push({
            name: variable,
            value: `${secretsPrefix}${secretName}`,
            jsonKey,
          });
        });

      if (!hasKeys || ordersLines[i].startsWith("export ")) {
        secrets.push({
          name: secretVar,
          value: `${secretsPrefix}${secretName}`,
        });
      }
    });

  return { secrets, results };
}

/**
 *
 * @param {GdsAccessMap} expected
 * @param {EpiAccessMap} actual
 */
function compareSecurity(expected, actual) {
  if (!expected || Object.keys(expected).length === 0) {
    return false;
  }
  if (expected && !actual) {
    return false;
  }
  for (let role in expected) {
    const epiRole = `jwt-${role}`;
    if (!actual[epiRole]) {
      return false;
    }
    if ((expected[role] & actual[epiRole]) !== expected[role]) {
      return false;
    }
  }

  return true;
}

function getMasks(access, roles) {
  const map = {};
  roles.forEach((role) => {
    map[role.name] = role;
  });

  const acceptableRoles = Object.keys(access).filter((key) => access[key]);

  const masks = {};
  acceptableRoles.forEach((roleName) => {
    const role = map[roleName];
    role.masks.forEach((mask) => {
      if (!masks[mask.claim]) {
        masks[mask.claim] = mask.mask;
      } else {
        masks[mask.claim] = masks[mask.claim] | mask.mask;
      }
    });
  });

  return { masks, acceptableRoles };
}

function getAccess(orders, roles) {
  const legacyRoleMap = {
    GLG_DENY_ALL: { claim: "role-glg", mask: 0 },
    GLG_USER: { claim: "role-glg", mask: 1 },
    GLG_CLIENT: { claim: "role-glg", mask: 2 },
    GLG_COUNCILMEMBER: { claim: "role-glg", mask: 4 },
    GLG_SURVEYRESPONDENT: { claim: "role-glg", mask: 8 },
    GLG_APP: { claim: "role-glg", mask: 16 },
    GLG_EXTERNAL_WORKER: { claim: "role-glg", mask: 32 },
    GLG_ALLOW_ALL: { claim: "role-glg", mask: 2147483647 },
  };

  const unknownRoles = [];
  const allClaims = [];

  const securityMode = getExportValue(orders, "SECURITY_MODE");
  const accessFlags =
    getExportValue(orders, "SESSION_ACCESS_FLAGS") ||
    getExportValue(orders, "JWT_ACCESS_FLAGS");

  if (securityMode !== "public") {
    const access = {};
    // Is this the gds way to declare access flags?
    if (/[\w-]+:\d+/.test(accessFlags)) {
      const flags = accessFlags.split(" ");
      flags.forEach((flag) => {
        let [claim, mask] = flag.split(":");
        const bashVar = /\${?(\w+)}?/.exec(mask);
        if (bashVar && bashVar[1].includes("_ROLE_")) {
          const suffix = bashVar[1].split("_ROLE_")[1];
          if (!legacyRoleMap[suffix]) {
            unknownRoles.push(flag);
            return;
          }
          if (suffix === "GLG_ALLOW_ALL") {
            access["Allow All"] = true;
            return;
          }
          const { mask: interpretedMask } = legacyRoleMap[suffix];
          mask = interpretedMask;
        }
        getMaskComponents(mask)
          .map((maskComponent) => {
            allClaims.push(`${claim}:${maskComponent}`);
            const claimSet = getRoleByClaim(roles, claim, maskComponent);
            if (!claimSet) {
              // handle the special case of legacy role-glg:2147483647
              if (
                claim !== legacyRoleMap.GLG_ALLOW_ALL.claim ||
                mask !== legacyRoleMap.GLG_ALLOW_ALL.mask.toString()
              ) {
                unknownRoles.push(`${claim}:${maskComponent}`);
              }
            }
            return claimSet;
          })
          .filter((claimSet) => claimSet)
          .forEach((claimSet) => {
            access[claimSet.name] = true;
          });
      });
    } else if (!isNaN(accessFlags)) {
      getMaskComponents(accessFlags)
        .map((maskComponent) => {
          allClaims.push(`role-glg:${maskComponent}`);
          const claimSet = getRoleByClaim(roles, "role-glg", maskComponent);
          if (!claimSet) {
            if (accessFlags !== legacyRoleMap.GLG_ALLOW_ALL.mask.toString()) {
              unknownRoles.push(`role-glg:${maskComponent}`);
            }
          }
          return claimSet;
        })
        .filter((claimSet) => claimSet)
        .forEach((claimSet) => {
          access[claimSet.name] = true;
        });
    } else {
      // The old starphleet way
      const declaredRoles = /\${?(\w+)}?/g;
      let bashVar;
      let i = 0;
      do {
        bashVar = declaredRoles.exec(accessFlags);
        i += 1;
        if (bashVar) {
          const flagVar = bashVar[1];
          const suffix = flagVar.split("_ROLE_")[1];
          if (!legacyRoleMap[suffix]) {
            unknownRoles.push(flagVar);
            continue;
          }
          if (suffix === "GLG_ALLOW_ALL") {
            access["Allow All"] = true;
            continue;
          }
          const { claim, mask } = legacyRoleMap[suffix];
          getMaskComponents(mask)
            .map((maskComponent) => {
              allClaims.push(`${claim}:${maskComponent}`);
              const claimSet = getRoleByClaim(roles, claim, maskComponent);
              if (!claimSet) {
                unknownRoles.push(`${claim}:${maskComponent}`);
              }
              return claimSet;
            })
            .filter((claimSet) => claimSet)
            .forEach((claimSet) => {
              access[claimSet.name] = true;
            });
        }
      } while (bashVar);
    }
    if (unknownRoles.length) {
      throw { unknownRoles, allClaims };
    }
    return access;
  }
  return null;
}

function getMaskComponents(mask) {
  const bits = (mask >>> 0).toString(2);
  const components = Array.from(bits)
    .reverse()
    .map(Number)
    .map((bit, i) => (2 * bit) ** (bit ? i : 1))
    .filter((bit) => bit);

  return components;
}

function getRoleByClaim(roles, claim, mask) {
  for (let role of roles) {
    for (let claimMask of role.masks) {
      if (claimMask.claim === claim && claimMask.mask === mask) {
        return { name: role.name, claim, mask };
      }
    }
  }
  return null;
}

function applyConfig({ config, serviceName, checkName, results }) {
  // If no overrides are configured, return the unmodified results
  if (!config || !config[serviceName] || !config[serviceName][checkName]) {
    return results;
  }

  // If the check is configured to be skipped for this service, return an empty array
  if (config[serviceName][checkName].skip) {
    return [];
  }

  // If a max level is configured for the check, enforce that
  // and return a modified results array
  const levels = ["success", "notice", "warning", "failure"];
  if (config[serviceName][checkName].maxLevel) {
    return results.map((result) => {
      if (
        levels.indexOf(result.level) >
        levels.indexOf(config[serviceName][checkName].maxLevel)
      ) {
        result.level = config[serviceName][checkName].maxLevel;
      }
      return result;
    });
  }

  return results;
}

const envvar = /^(export\s+|)(\w+)=['"](.+)['"]/;
function parseEnvVar(line) {
  const match = envvar.exec(line);
  if (match) {
    const [, exported, name, value] = match;
    return {
      exported: !!exported,
      name,
      value,
    };
  }
  return {};
}

module.exports = {
  isAJob,
  getContents,
  getExportValue,
  httpGet,
  generateSecretsPolicy,
  getSimpleSecret,
  getSecretsFromOrders,
  compareSecurity,
  getMasks,
  getMaskComponents,
  getRoleByClaim,
  getAccess,
  getClusterType,
  applyConfig,
  parseEnvVar,
  isChinaClusterConfig,
};
