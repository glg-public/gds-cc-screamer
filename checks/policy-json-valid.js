require("../typedefs");
const log = require("loglevel");
const path = require("path");
const {
  getLinesForJSON,
  suggest,
  getLineNumber,
  getLineWithinObject,
  escapeRegExp,
  detectIndentation,
  getNewFileLink,
  getOwnerRepoBranch,
  generateSecretsPolicy,
  getSimpleSecret,
} = require("../util");

const lowerVersion = /"version"/;
const lowerStatement = /"statement"/;
const lowerId = /"id"/;
const lowerSid = /"sid"/;
const lowerEffect = /"effect"/;
const lowerPrincipal = /"principal"/;
const wrongPrinciple = /"principle"/i;
const lowerAction = /"action"/;
const lowerNotAction = /"(notAction|notaction|Notaction)"/;
const lowerResource = /"resource"/;
const lowerNotResource = /"(notResource|notresource|Notresource)"/;
const lowerCondition = /"condition"/;
const actionString = /(^\*$|^\w+:[\w\*]+$)/;
const arnRegex =
  /(arn:(?<partition>[\w\*\-]*):(?<service>[\w\*\-]*):(?<region>[\w\*\-]*):(?<accountId>[\d\*]*):(?<resourceId>[\w\*\-\/\:]*)|^\*$)/;

const warnActions = [/^\*$/, /[\w\*]+:Delete[\w\*]/, /[\w\*]+:\*/];

const warnResources = [/^\*$/, /arn:aws:\\*?:.*/];

const secretsAction = "secretsmanager:GetSecretValue";

/**
 * Checks policy.json for validity and completeness
 * @param {Deployment} deployment
 * @param {GitHubContext} context The context object provided by github
 *
 * @returns {Array<Result>}
 */
async function policyJsonIsValid(deployment, context) {
  function _suggestNewPolicyFile(secretsJson) {
    const policyDoc = JSON.stringify(
      generateSecretsPolicy(secretsJson),
      null,
      2
    );
    const { owner, repo, branch } = getOwnerRepoBranch(context);
    const filename = path.join(deployment.serviceName, "policy.json");
    return {
      title: "Create a policy.json",
      level: "failure",
      line: 0,
      problems: [
        `Add a new file, \`${filename}\`, that contains the following:\n\`\`\`json
${policyDoc}
\`\`\`\n[Click To Add File](${getNewFileLink({
          owner,
          repo,
          branch,
          filename,
          value: policyDoc,
        })})`,
      ],
    };
  }

  // policy.json is not required, unless secrets.json is present
  if (!deployment.policyJsonContents && deployment.secretsJson) {
    log.info(
      `policy.json is missing, but required - ${deployment.serviceName}`
    );
    return [_suggestNewPolicyFile(deployment.secretsJson)];
  }

  if (!deployment.policyJsonContents) {
    log.info(`No policy.json present, skipping - ${deployment.serviceName}`);
    return [];
  }
  log.info(`policy.json is valid - ${deployment.policyJsonPath}`);

  let { results, document } = validateGenericIamPolicy(
    deployment.policyJsonContents.join("\n"),
    deployment.policyJsonPath
  );

  if (!document) {
    return results;
  }

  // We will toggle these to true as we encounter them in the policy
  const requiredActions = {};

  // Secrets access is only needed for services that use secrets
  if (deployment.secretsJsonContents) {
    requiredActions[secretsAction] = false;
  }

  function _toggleRequiredAction(item) {
    // This way, ecr:* would toggle all of the required ECR actions
    const keyRegex = new RegExp(item.replace(/\*/g, "\\w+"));
    Object.keys(requiredActions)
      .filter((key) => keyRegex.test(key))
      .forEach((key) => (requiredActions[key] = true));
  }

  function _standardizeStatement(statement) {
    const action =
      statement.Action ||
      statement.action ||
      statement.NotAction ||
      statement.notAction ||
      statement.notaction ||
      statement.Notaction;

    const resource =
      statement.Resource ||
      statement.resource ||
      statement.NotResource ||
      statement.notResource ||
      statement.notresource ||
      statement.Notresource;

    const effect = statement.Effect || statement.effect;

    return { original: statement, standard: { effect, action, resource } };
  }

  function _isAllowed(statement) {
    return (
      statement.action && statement.resource && /allow/i.test(statement.effect)
    );
  }

  function _isAboutSecrets(statement) {
    const { action } = statement;

    if (typeof action === "string" && actionString.test(action)) {
      const keyRegex = new RegExp(action.replace(/\*/g, "\\w+"));
      return keyRegex.test(secretsAction);
    } else if (Array.isArray(action)) {
      let isAboutSecrets = false;
      action
        .filter((item) => actionString.test(item))
        .forEach((item) => {
          const keyRegex = new RegExp(item.replace(/\*/g, "\\w+"));
          if (keyRegex.test(secretsAction)) {
            isAboutSecrets = true;
          }
        });
      return isAboutSecrets;
    }
  }

  function _isWarnAction(line) {
    for (let regex of warnActions) {
      if (regex.test(line)) {
        return true;
      }
    }
    return false;
  }

  function _isWarnResource(line) {
    for (let regex of warnResources) {
      if (regex.test(line)) {
        return true;
      }
    }
    return false;
  }

  function _getWarnResult(searchBlock, line) {
    const regex = new RegExp(`"${escapeRegExp(line)}"`, "i");
    let title = "Broad Permissions";
    let problem =
      "It is best practice to be as specific as possible with your IAM Policies. Overly broad policies can lead to unintentional vulnerabilities.";
    if (/delete/i.test(line)) {
      title = "Delete Access";
      problem =
        "It is extremely rare that a service needs Delete access. Make sure you have discussed this with SRE before merging.";
    }
    return {
      title,
      path: deployment.policyJsonPath,
      line: getLineWithinObject(
        deployment.policyJsonContents,
        searchBlock,
        regex
      ),
      level: "warning",
      problems: [problem],
    };
  }

  // Validate the presence of all required actions
  const statementBlock = document.Statement || document.statement || [];
  statementBlock
    .map(_standardizeStatement)
    .filter(({ standard }) => _isAllowed(standard))
    .forEach(({ original, standard }) => {
      const { action, resource } = standard;
      if (typeof action === "string" && actionString.test(action)) {
        _toggleRequiredAction(action);
        if (_isWarnAction(action)) {
          results.push(_getWarnResult(original, action));
        }
      } else if (Array.isArray(action)) {
        action
          .filter((item) => actionString.test(item))
          .forEach((item) => {
            _toggleRequiredAction(item);
            if (_isWarnAction(item)) {
              results.push(_getWarnResult(original, item));
            }
          });
      }

      if (typeof resource === "string" && _isWarnResource(resource)) {
        results.push(_getWarnResult(original, resource));
      } else if (Array.isArray(resource)) {
        resource.filter(_isWarnResource).forEach((item) => {
          results.push(_getWarnResult(original, item));
        });
      }
    });

  // If there's a secrets.json, we should make sure this policy
  // grants access to those secrets
  if (deployment.secretsJson) {
    const requiredSecrets = {};
    deployment.secretsJson.forEach((secret) => {
      requiredSecrets[getSimpleSecret(secret.valueFrom)] = false;
    });

    function _toggleRequiredSecret(resource) {
      // We need to account for wildcards
      const keyRegex = new RegExp(
        resource.replace(/\*/g, "[\\w\\-\\/\\:]+").replace(/\?/g, "[\\w\\?]") +
          "$"
      );
      Object.keys(requiredSecrets)
        .filter((key) => keyRegex.test(key))
        .forEach((key) => (requiredSecrets[key] = true));
    }

    function _suggestSecretsSuffix(originalBlock, originalArn, newArn) {
      const regex = new RegExp(escapeRegExp(originalArn));
      const line = getLineWithinObject(
        deployment.policyJsonContents,
        originalBlock,
        regex
      );
      return {
        title: "Add a version suffix to this secret ARN",
        problems: [
          suggest(
            "IAM policies should specifiy a version suffix for secrets. This can be `??????` when you always want the latest version.",
            deployment.policyJsonContents[line - 1].replace(originalArn, newArn)
          ),
        ],
        line: line,
        level: "failure",
        path: deployment.policyJsonPath,
      };
    }

    const secretsSuffix = /(-[\w\?]{6}$|-?\*$)/;

    statementBlock
      .map(_standardizeStatement)
      .filter(({ standard }) => _isAllowed(standard))
      .filter(({ standard }) => _isAboutSecrets(standard))
      .forEach(({ standard: { resource }, original }) => {
        if (typeof resource === "string") {
          if (!secretsSuffix.test(resource)) {
            const baseArn = resource;
            resource += "-??????";
            results.push(_suggestSecretsSuffix(original, baseArn, resource));
          }
          _toggleRequiredSecret(resource);
        } else if (Array.isArray(resource)) {
          resource.forEach((item) => {
            if (!secretsSuffix.test(item)) {
              const baseArn = item;
              item += "-??????";
              results.push(_suggestSecretsSuffix(original, baseArn, item));
            }
            _toggleRequiredSecret(item);
          });
        }
      });

    // Validate that all required secrets are accounted for
    if (
      statementBlock.length > 0 &&
      !Object.keys(requiredSecrets).every((s) => requiredSecrets[s])
    ) {
      const result = {
        title: "Policy is missing required secrets",
        path: deployment.policyJsonPath,
        problems: [],
        line: 0,
        level: "failure",
      };

      function _getSids() {
        return statementBlock
          .map((statement) => statement.Sid)
          .filter((sid) => sid);
      }

      Object.keys(requiredSecrets)
        .filter((key) => requiredSecrets[key] === false)
        .forEach((key) =>
          result.problems.push(
            `Your secrets.json requests ${key}, but your policy does not allow access.`
          )
        );

      // Sids must be unique within a policy
      let Sid = "AllowSecretsAccess";
      let i = 0;
      const allSids = _getSids();
      while (allSids.includes(Sid)) {
        i += 1;
        Sid = `AllowSecretsAccess${i}`;
      }

      const newStatementBlock = {
        Sid,
        Effect: "Allow",
        Action: secretsAction,
        Resource: Array.from(
          new Set(
            Object.keys(requiredSecrets).filter((s) => !requiredSecrets[s])
          )
        ),
      };

      // This lets us indent more correctly
      const { indent } = detectIndentation(deployment.policyJsonContents);
      const newPolicy = Object.assign({}, document);
      newPolicy.Statement = statementBlock.concat([newStatementBlock]);
      const newPolicyLines = JSON.stringify(newPolicy, null, indent).split(
        "\n"
      );
      const { start, end } = getLinesForJSON(newPolicyLines, newStatementBlock);
      const stringifiedStatement = `\n${newPolicyLines
        .slice(start - 1, end)
        .join("\n")}`;

      const { end: lineToAnnotate } = getLinesForJSON(
        deployment.policyJsonContents,
        statementBlock[statementBlock.length - 1]
      );

      result.line = lineToAnnotate;

      const oldLine = deployment.policyJsonContents[lineToAnnotate - 1];
      let newLine = oldLine;
      if (!oldLine.endsWith(",")) {
        newLine += ",";
      }
      newLine += stringifiedStatement;
      result.problems.push(
        suggest("Add the following statement block", newLine)
      );

      results.push(result);
    }
  }

  // Validate that all required actions have been satisfied
  if (
    statementBlock.length > 0 &&
    !Object.keys(requiredActions).every((a) => requiredActions[a])
  ) {
    const result = {
      title: "Policy is missing required actions",
      path: deployment.policyJsonPath,
      problems: [],
      line: 0,
      level: "failure",
    };

    Object.keys(requiredActions)
      .filter((key) => !requiredActions[key])
      .forEach((key) =>
        result.problems.push(
          `To run in GDS, your service requires the ${key} action.`
        )
      );

    results.push(result);
  }

  if (results.filter((result) => result.level === "failure").length === 0) {
    deployment.policyJson = document;
  }

  return results;
}

function maybeFixCapitalization({
  line,
  lineNumber,
  regex,
  correct,
  policyJsonPath,
  title = "Capitalize this key",
}) {
  if (regex.test(line)) {
    return {
      title: "Statement must be capitalized",
      path: policyJsonPath,
      problems: [suggest(title, line.replace(regex, correct))],
      line: lineNumber,
      level: "failure",
    };
  }
}

/**
 * Accepts a string or buffer, and validates it as an
 * AWS IAM Policy Document.
 * @param {string|Buffer} file
 * @param {string} filePath the path the file lives at
 */
function validateGenericIamPolicy(file, filePath) {
  let results = [];
  let fileLines = file.toString().split("\n");

  // policy.json must be valid json
  let policyJson;
  try {
    policyJson = JSON.parse(file);
  } catch (e) {
    return {
      results: [
        {
          title: "policy.json is not valid JSON",
          path: filePath,
          problems: [
            `An error was encountered while trying to JSON parse ${filePath}`,
          ],
          line: 0,
          level: "failure",
        },
      ],
    };
  }

  if (Object.prototype.toString.call(policyJson) !== "[object Object]") {
    return {
      results: [
        {
          title: `Invalid policy.json`,
          path: filePath,
          problems: ["policy.json must be a valid AWS IAM Policy"],
          line: 1,
          level: "failure",
        },
      ],
    };
  }

  // AWS JSON Keys are capitalized
  for (let i = 0; i < fileLines.length; i++) {
    const line = fileLines[i];
    const lineNumber = i + 1;

    const capResults = [
      {
        line,
        lineNumber,
        regex: lowerId,
        correct: '"Id"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerVersion,
        correct: '"Version"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerStatement,
        correct: '"Statement"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerSid,
        correct: '"Sid"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerEffect,
        correct: '"Effect"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerPrincipal,
        correct: '"Principal"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: wrongPrinciple,
        correct: '"Principal"',
        policyJsonPath: filePath,
        title: "Wrong spelling of Principal",
      },
      {
        line,
        lineNumber,
        regex: lowerAction,
        correct: '"Action"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerNotAction,
        correct: '"NotAction"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerResource,
        correct: '"Resource"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerNotResource,
        correct: '"NotResource"',
        policyJsonPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerCondition,
        correct: '"Condition"',
        policyJsonPath: filePath,
      },
    ]
      .map(maybeFixCapitalization)
      .filter((s) => s);

    results = results.concat(capResults);
  }

  // There are only two acceptable versions
  const version = policyJson.Version || policyJson.version;
  const acceptableVersions = ["2008-10-17", "2012-10-17"];

  if (!version) {
    results.push({
      title: 'Policy must have a "Version" field',
      path: filePath,
      problems: ['"Version" is a required field.'],
      line: 0,
      level: "failure",
    });
  } else if (acceptableVersions.indexOf(version) === -1) {
    const lineRegex = new RegExp(`"Version":\\s*"${version}"`, "i");
    results.push({
      title: "Invalid Version",
      path: filePath,
      problems: [`Version must be one of: ${acceptableVersions.join(", ")}`],
      line: getLineNumber(fileLines, lineRegex),
      level: "failure",
    });
  }

  // Statement is a required field
  const statementBlock = policyJson.Statement || policyJson.statement || [];
  if (!statementBlock || statementBlock.length === 0) {
    results.push({
      title: 'Policy must have a "Statement" block.',
      path: filePath,
      problems: ['"Statement" is a required field'],
      line: 0,
      level: "failure",
    });
  }

  // Statement blocks have some required fields
  for (let statement of statementBlock) {
    const result = {
      title: "Statement is missing required fields.",
      path: filePath,
      problems: [],
      level: "failure",
    };

    if (!(statement.Effect || statement.effect)) {
      result.problems.push(
        'All policy statements must include an "Effect" field. Must be "Allow" or "Deny"'
      );
    }

    const action =
      statement.Action ||
      statement.action ||
      statement.NotAction ||
      statement.notAction ||
      statement.notaction ||
      statement.Notaction;
    if (!action) {
      result.problems.push(
        'All policy statements must include an "Action" field.'
      );
    } else if (typeof action !== "string" && !Array.isArray(action)) {
      result.problems.push(
        'The "Action" field must either be a string, or an array of strings.'
      );
    }

    const resource =
      statement.Resource ||
      statement.resource ||
      statement.NotResource ||
      statement.notResource ||
      statement.notresource ||
      statement.Notresource;
    if (!resource) {
      result.problems.push(
        'All policy statements must include a "Resource" field.'
      );
    } else if (typeof resource !== "string" && !Array.isArray(resource)) {
      result.problems.push(
        'The "Resource" field must either be a string, or an array of strings.'
      );
    }

    if (result.problems.length > 0) {
      const lines = getLinesForJSON(fileLines, statement);
      if (lines.start === lines.end) {
        result.line = lines.start;
      } else {
        result.line = lines;
      }
      results.push(result);
    }
  }

  const usedSids = new Set();
  // There is further validation to be done in each statement block
  statementBlock.forEach((statement) => {
    // Validate Effect statement
    let effect = statement.Effect || statement.effect; // we already suggested capitalization fixes
    if (effect && ["Allow", "Deny"].indexOf(effect) === -1) {
      const lineRegex = new RegExp(`"Effect":\\s*"${effect}"`, "i");
      const line = getLineWithinObject(fileLines, statement, lineRegex);

      results.push({
        title: 'Invalid value for "Effect"',
        path: filePath,
        problems: ['"Effect" must be one of: Allow, Deny'],
        line,
        level: "failure",
      });
    }

    /**
     * Sid is not actually required, but
     * if you include one, there are rules
     */
    const sid = statement.Sid || statement.sid;
    const sidRules = /^[0-9A-Za-z]*$/;
    if (sid && !sidRules.test(sid)) {
      const problem = `Statement IDs (SID) must be alpha-numeric. Check that your input satisfies the regular expression \`${sidRules}\``;
      const lineRegex = new RegExp(`"Sid":\\s*"${escapeRegExp(sid)}"`, "i");
      const line = getLineWithinObject(fileLines, statement, lineRegex);

      results.push({
        title: 'Invalid value for "Sid"',
        path: filePath,
        problems: [problem],
        line,
        level: "failure",
      });
    }

    if (sid && usedSids.has(sid)) {
      const lineRegex = new RegExp(`"Sid":\\s*"${escapeRegExp(sid)}"`, "i");
      const line = getLineWithinObject(fileLines, statement, lineRegex);
      const result = {
        title: "`Sid` Must Be Unique",
        path: filePath,
        line,
        level: "failure",
        problems: ["`Sid` must be unique within each policy."],
      };
      results.push(result);
    }

    if (sid) {
      usedSids.add(sid);
    }

    // Validate Action Block
    const action =
      statement.Action ||
      statement.action ||
      statement.NotAction ||
      statement.notAction ||
      statement.notaction ||
      statement.Notaction; // we already suggested capitalization fixes
    const actionFmtError =
      '"Action" must be either a valid [Action String](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), or an array of valid action strings. SRE recommends as specific of an Action String as possible.';
    if (action && typeof action === "string" && !actionString.test(action)) {
      const lineRegex = new RegExp(
        `"Action":\\s*"${escapeRegExp(action)}"`,
        "i"
      );
      const line = getLineWithinObject(fileLines, statement, lineRegex);

      results.push({
        title: 'Invalid value for "Action"',
        path: filePath,
        problems: [actionFmtError],
        line,
        level: "failure",
      });
    } else if (action && Array.isArray(action)) {
      action
        .filter((item) => !actionString.test(item))
        .forEach((item) => {
          const lineRegex = new RegExp(`"${escapeRegExp(item)}"`);
          const line = getLineWithinObject(fileLines, statement, lineRegex);

          results.push({
            title: 'Invalid value for "Action"',
            path: filePath,
            problems: [actionFmtError],
            line,
            level: "failure",
          });
        });
    }

    const resource =
      statement.Resource ||
      statement.resource ||
      statement.NotResource ||
      statement.notResource ||
      statement.notresource ||
      statement.Notresource; // we already suggested capitalization fixes
    const resourceFmtError =
      '"Resource" must be either a valid [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html), or an array of valid ARNs. SRE recommends as specific of an ARN as possible.';
    if (resource && typeof resource === "string" && !arnRegex.test(resource)) {
      const lineRegex = new RegExp(
        `"Resource":\\s*"${escapeRegExp(resource)}"`,
        "i"
      );
      const line = getLineWithinObject(fileLines, statement, lineRegex);

      results.push({
        title: 'Invalid value for "Resource"',
        path: filePath,
        problems: [resourceFmtError],
        line,
        level: "failure",
      });
    } else if (resource && Array.isArray(resource)) {
      resource
        .filter((item) => !arnRegex.test(item))
        .forEach((item) => {
          const lineRegex = new RegExp(`"${escapeRegExp(item)}"`);
          const line = getLineWithinObject(fileLines, statement, lineRegex);

          results.push({
            title: 'Invalid value for "Resource"',
            path: filePath,
            problems: [resourceFmtError],
            line,
            level: "failure",
          });
        });
    }
  });

  return { results, document: policyJson };
}

module.exports = policyJsonIsValid;
