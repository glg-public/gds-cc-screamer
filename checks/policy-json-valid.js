require('../typedefs');
const core = require("@actions/core");
const {
  getLinesForJSON,
  suggest,
  getLineNumber,
  getLineWithinObject,
  escapeRegExp
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
const arnRegex = /(arn:(?<partition>[\w\*\-]*):(?<service>[\w\*\-]*):(?<region>[\w\*\-]*):(?<accountId>[\d\*]*):(?<resourceId>[\w\*\-\/\:]*)|^\*$)/;

const warnActions = [
  /^\*$/,
  /[\w\*]+:Delete[\w\*]/,
  /[\w\*]+:\*/
];

const warnResources = [
  /^\*$/,
  /arn:aws:\\*?:.*/
];

const secretArn = /arn:(?<partition>[\w\*\-]*):secretsmanager:(?<region>[\w-]*):(?<account>\d*):secret:(?<secretName>[\w-\/]*)(:(?<jsonKey>\S*?):(?<versionStage>\S*?):(?<versionId>\w*)|)/;



/**
 * Accepts an orders object, and does some kind of check
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function policyJsonIsValid(deployment) {
  // policy.json is not required
  if (!deployment.policyContents) {
    core.info(`No policy.json present, skipping - ${deployment.path}`);
    return [];
  }
  core.info(`policy.json is valid - ${deployment.policyPath}`);

  let { results, document } = validateGenericIamPolicy(
    deployment.policyContents.join("\n"),
    deployment.policyPath
  );

  if (!document) {
    return results;
  }

  // We will toggle these to true as we encounter them in the policy
  const requiredActions = {
    "ecr:GetAuthorizationToken": false,
    "ecr:BatchCheckLayerAvailability": false,
    "ecr:GetDownloadUrlForLayer": false,
    "ecr:BatchGetImage": false,
    "logs:CreateLogStream": false,
    "logs:PutLogEvents": false,
  };

  // Secrets access is only needed for services that use secrets
  const secretsAction = "secretsmanager:GetSecretValue";
  if (deployment.secretsContents) {
    requiredActions[secretsAction] = false;
  }

  function _getSimpleSecret(secret) {
    const match = secretArn.exec(secret);
    const { partition, region, account, secretName } = match.groups;
    return `arn:${partition}:secretsmanager:${region}:${account}:secret:${secretName}`;
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

    return { original: statement, standard: { effect, action, resource }};
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
      action
        .filter((item) => actionString.test(item))
        .forEach((item) => {
          const keyRegex = new RegExp(item.replace(/\*/g, "\\w+"));
          if (keyRegex.test(secretsAction)) {
            return true;
          }
        });
      return false;
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
    const regex = new RegExp(`"${escapeRegExp(line)}"`, 'i');
    let title = 'Broad Permissions';
    let problem = 'It is best practice to be as specific as possible with your IAM Policies. Overly broad policies can lead to unintentional vulnerabilities.';
    if (/delete/i.test(line)) {
      title = 'Delete Access'
      problem = 'It is extremeley rare that a service needs Delete access. Make sure you have discussed this with SRE before merging.';
    }
    return {
      title,
      path: deployment.policyPath,
      line: getLineWithinObject(deployment.policyContents, searchBlock, regex),
      level: 'warning',
      problems: [
        problem
      ]
    }
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

      if (typeof resource === "string" && _isWarnResource(resource)){
        results.push(_getWarnResult(original, resource));
      } else if (Array.isArray(resource)) {
        resource
          .filter(_isWarnResource)
          .forEach(item => {
            results.push(_getWarnResult(original, item));
          });
      }
    });


  // If there's a secrets.json, we should make sure this policy
  // grants access to those secrets
  if (deployment.secretsJson) {
    const requiredSecrets = {};
    deployment.secretsJson.forEach((secret) => {
      requiredSecrets[_getSimpleSecret(secret.valueFrom)] = false;
    });

    function _toggleRequiredSecret(resource) {
      // We need to account for wildcards
      const keyRegex = new RegExp(resource.replace(/\*/g, "[\\w\\-\\/\\:]+") + "$");
      Object.keys(requiredSecrets)
        .filter((key) => keyRegex.test(key))
        .forEach((key) => (requiredSecrets[key] = true));
    }

    statementBlock
      .map(_standardizeStatement)
      .filter(({ standard }) => _isAllowed(standard))
      .filter(({ standard }) => _isAboutSecrets(standard))
      .forEach(({ standard: { resource }}) => {
        if (typeof resource === "string") {
          _toggleRequiredSecret(resource);
        } else if (Array.isArray(resource)) {
          resource.forEach(_toggleRequiredSecret);
        }
      });

    // Validate that all required secrets are accounted for
    if (
      statementBlock.length > 0 &&
      !Object.keys(requiredSecrets).every((s) => requiredSecrets[s])
    ) {
      const result = {
        title: "Policy is missing required secrets",
        path: deployment.policyPath,
        problems: [],
        line: 0,
        level: "failure",
      };

      Object.keys(requiredSecrets)
        .filter((key) => !requiredSecrets[key])
        .forEach((key) =>
          result.problems.push(
            `Your secrets.json requests ${key}, but your policy does not allow access.`
          )
        );

      const newStatementBlock = {
        Sid: "AllowRequiredSecrets",
        Effect: "Allow",
        Action: secretsAction,
        Resource: Array.from(new Set(
          Object.keys(requiredSecrets)
            .filter((s) => !requiredSecrets[s])
            .map(_getSimpleSecret)
          ))
      };

      // This lets us indent more correctly
      const newPolicy = Object.assign({}, document);
      newPolicy.Statement = statementBlock.concat([newStatementBlock]);
      const newPolicyLines = JSON.stringify(newPolicy, null, 2).split("\n");
      const { start, end } = getLinesForJSON(newPolicyLines, newStatementBlock);
      const stringifiedStatement = `\n${newPolicyLines
        .slice(start - 1, end)
        .join("\n")}`;

      const { end: lineToAnnotate } = getLinesForJSON(
        deployment.policyContents,
        statementBlock[statementBlock.length - 1]
      );

      result.line = lineToAnnotate;

      const oldLine = deployment.policyContents[lineToAnnotate - 1];
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
      path: deployment.policyPath,
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

  return results;
}

function maybeFixCapitalization({
  line,
  lineNumber,
  regex,
  correct,
  policyPath,
  title = "Capitalize this key",
}) {
  if (regex.test(line)) {
    return {
      title: "Statement must be capitalized",
      path: policyPath,
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
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerVersion,
        correct: '"Version"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerStatement,
        correct: '"Statement"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerSid,
        correct: '"Sid"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerEffect,
        correct: '"Effect"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerPrincipal,
        correct: '"Principal"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: wrongPrinciple,
        correct: '"Principal"',
        policyPath: filePath,
        title: "Wrong spelling of Principal",
      },
      {
        line,
        lineNumber,
        regex: lowerAction,
        correct: '"Action"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerNotAction,
        correct: '"NotAction"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerResource,
        correct: '"Resource"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerNotResource,
        correct: '"NotResource"',
        policyPath: filePath,
      },
      {
        line,
        lineNumber,
        regex: lowerCondition,
        correct: '"Condition"',
        policyPath: filePath,
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
      results.problems.push(
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

    // Validate Action Block
    const action =
      statement.Action ||
      statement.action ||
      statement.NotAction ||
      statement.notAction ||
      statement.notaction ||
      statement.Notaction; // we already suggested capitalization fixes
    const actionFmtError = '"Action" must be either a valid [Action String](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), or an array of valid action strings. SRE recommends as specific of an Action String as possible.';
    if (action && typeof action === "string" && !actionString.test(action)) {
      const lineRegex = new RegExp(`"Action":\\s*"${escapeRegExp(action)}"`, "i");
      const line = getLineWithinObject(fileLines, statement, lineRegex);

      results.push({
        title: 'Invalid value for "Action"',
        path: filePath,
        problems: [
          actionFmtError,
        ],
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
            problems: [
              actionFmtError,
            ],
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
    const resourceFmtError = '"Resource" must be either a valid [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html), or an array of valid ARNs. SRE recommends as specific of an ARN as possible.';
    if (resource && typeof resource === "string" && !arnRegex.test(resource)) {
      const lineRegex = new RegExp(`"Resource":\\s*"${escapeRegExp(resource)}"`, "i");
      const line = getLineWithinObject(fileLines, statement, lineRegex);

      results.push({
        title: 'Invalid value for "Resource"',
        path: filePath,
        problems: [
          resourceFmtError,
        ],
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
            problems: [
              resourceFmtError,
            ],
            line,
            level: "failure",
          });
        });
    }
  });

  return { results, document: policyJson };
}

module.exports = policyJsonIsValid;
