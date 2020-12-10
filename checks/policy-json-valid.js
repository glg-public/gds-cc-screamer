const core = require('@actions/core');
const { getLinesForJSON, suggest, getLineNumber, getLineWithinObject } = require('../util');

const lowerVersion = /"version"/;
const lowerStatement = /"statement"/;
const lowerId = /"id"/;
const lowerSid = /"sid"/;
const lowerEffect = /"effect"/;
const lowerPrincipal = /"principal"/;
const wrongPrinciple = /"principle"/i;
const lowerAction = /"action"/;
const lowerNotAction = /"(notAction|notaction|Notaction)"/
const lowerResource = /"resource"/;
const lowerNotResource = /"(notResource|notresource|Notresource)"/
const lowerCondition = /"condition"/;

const actionString = /(^\*$|^\w+:[\w\*]+$)/;
const arnRegex = /(arn:(?<partition>[\w\*\-]*):(?<service>[\w\*\-]*):(?<region>[\w\*\-]*):(?<accountId>[\d\*]*):(?<resourceId>[\w\*\-\/\:]*)|^\*$)/;

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github 
 */
async function policyJsonIsValid(orders, context) {
  let results = [];

  // policy.json is not required
  if (!orders.policyContents) {
    core.info(`No policy.json present, skipping - ${orders.path}`)
    return results;
  }
  core.info(`policy.json is valid - ${orders.policyPath}`);
  
  // policy.json must be valid json
  let policyJson;
  try {
    policyJson = JSON.parse(orders.policyContents.join('\n'));
  } catch (e) {
    return [{
      title: "policy.json is not valid JSON",
      path: orders.policyPath,
      problems: [`An error was encountered while trying to JSON parse ${orders.policyPath}`],
      line: 0,
      level: 'failure'
    }];
  }

  if (Object.prototype.toString.call(policyJson) !== '[object Object]') {
    return [{
      title: `Invalid policy.json`,
      path: orders.policyPath,
      problems: ["policy.json must be a valid AWS IAM Policy"],
      line: 1,
      level: 'failure'
    }];
  }

  // AWS JSON Keys are capitalized
  for (let i = 0; i < orders.policyContents.length; i++) {
    const line = orders.policyContents[i];
    const lineNumber = i+1;

    let capResults = [
      { line, lineNumber, regex: lowerId, correct: '"Id"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerVersion, correct: '"Version"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerStatement, correct: '"Statement"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerSid, correct: '"Sid"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerEffect, correct: '"Effect"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerPrincipal, correct: '"Principal"', policyPath: orders.policyPath},
      { line, lineNumber, regex: wrongPrinciple, correct: '"Principal"', policyPath: orders.policyPath, title: 'Wrong spelling of Principal'},
      { line, lineNumber, regex: lowerAction, correct: '"Action"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerNotAction, correct: '"NotAction"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerResource, correct: '"Resource"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerNotResource, correct: '"NotResource"', policyPath: orders.policyPath},
      { line, lineNumber, regex: lowerCondition, correct: '"Condition"', policyPath: orders.policyPath},
    ].map(maybeFixCapitalization).filter(s => s);

    results = results.concat(capResults);
  }

  // There are only two acceptable versions
  const version = policyJson.Version || policyJson.version;
  const acceptableVersions = ["2008-10-17", "2012-10-17"];

  if (!version) {
    results.push({
      title: 'Policy must have a "Version" field',
      path: orders.policyPath,
      problems: ['"Version" is a required field.'],
      line: 0,
      level: 'failure'
    });
  } else if (acceptableVersions.indexOf(version) === -1) {
    const lineRegex = RegExp(`"Version":\\s*"${version}"`, 'i');
    results.push({
      title: 'Invalid Version',
      path: orders.policyPath,
      problems: [`Version must be one of: ${acceptableVersions.join(', ')}`],
      line: getLineNumber(orders.policyContents, lineRegex),
      level: 'failure'
    });
  }

  // Statement is a required field
  const statementBlock = policyJson.Statement || policyJson.statement || [];
  if (!statementBlock || statementBlock.length === 0) {
    results.push({
      title: 'Policy must have a "Statement" block.',
      path: orders.policyPath,
      problems: ['"Statement" is a required field'],
      line: 0,
      level: 'failure'
    });
  }

  // Statement blocks have some required fields
  for (let statement of statementBlock) {
    const result = {
      title: 'Statement is missing required fields.',
      path: orders.policyPath,
      problems: [],
      level: 'failure'
    }
    
    if (!(statement.Effect || statement.effect)) {
      result.problems.push('All policy statements must include an "Effect" field. Must be "Allow" or "Deny"');
    }

    const action = statement.Action || statement.action || statement.NotAction || statement.notAction || statement.notaction || statement.Notaction;
    if (!action) {
      result.problems.push('All policy statements must include an "Action" field.');
    } else if (typeof action !== 'string' && !Array.isArray(action)) {
      result.problems.push('The "Action" field must either be a string, or an array of strings.');
    }

    const resource = statement.Resource || statement.resource || statement.NotResource || statement.notResource || statement.notresource || statement.Notresource;
    if (!resource) {
      results.problems.push('All policy statements must include a "Resource" field.')
    } else if (typeof resource !== 'string' && !Array.isArray(resource)) {
      result.problems.push('The "Resource" field must either be a string, or an array of strings.');
    }

    if (result.problems.length > 0) {
      const lines = getLinesForJSON(orders.policyContents, statement);
      if (lines.start === lines.end) {
        result.line = lines.start;
      } else {
        result.line = lines;
      }
      results.push(result);
    }
  }

  // There is further validation to be done in each statement block
  for (let statement of statementBlock) {
    let effect = statement.Effect || statement.effect; // we already suggested capitalization fixes
    if (effect && ["Allow", "Deny"].indexOf(effect) === -1) {
      const lineRegex = RegExp(`"Effect":\\s*"${effect}"`, 'i');
      const line = getLineWithinObject(orders.policyContents, statement, lineRegex);
      
      results.push({
        title: 'Invalid value for "Effect"',
        path: orders.policyPath,
        problems: ['"Effect" must be one of: Allow, Deny'],
        line,
        level: 'failure'
      });
    }

    const action = statement.Action || statement.action || statement.NotAction || statement.notAction || statement.notaction || statement.Notaction; // we already suggested capitalization fixes
    if (action && typeof action === 'string' && !actionString.test(action)) {
      const lineRegex = RegExp(`"Action":\\s*"${action}"`, 'i');
      const line = getLineWithinObject(orders.policyContents, statement, lineRegex);
      
      results.push({
        title: 'Invalid value for "Action"',
        path: orders.policyPath,
        problems: ['"Action" must be either a valid [Action String](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), or an array of valid action strings.'],
        line,
        level: 'failure'
      });
    } else if (action && Array.isArray(action)) {
      for (let item of action) {
        if (!actionString.test(item)) {
          const lineRegex = RegExp(`"${item}"`);
          const line = getLineWithinObject(orders.policyContents, statement, lineRegex);
          
          results.push({
            title: 'Invalid value for "Action"',
            path: orders.policyPath,
            problems: ['"Action" must be either a valid [Action String](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), or an array of valid action strings.'],
            line,
            level: 'failure'
          });
        }
      }
    }

    const resource = statement.Resource || statement.resource || statement.NotResource || statement.notResource || statement.notresource || statement.Notresource; // we already suggested capitalization fixes

    if (resource && typeof resource === 'string' && !arnRegex.test(resource)) {
      const lineRegex = RegExp(`"Resource":\\s*"${resource}"`, 'i');
      const line = getLineWithinObject(orders.policyContents, statement, lineRegex);
      
      results.push({
        title: 'Invalid value for "Resource"',
        path: orders.policyPath,
        problems: ['"Resource" must be either a valid [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html), or an array of valid ARNs.'],
        line,
        level: 'failure'
      });
    } else if (resource && Array.isArray(resource)) {
      for (let item of resource) {
        if (!arnRegex.test(item)) {
          const lineRegex = RegExp(`"${item}"`);
          const line = getLineWithinObject(orders.policyContents, statement, lineRegex);
          
          results.push({
            title: 'Invalid value for "Resource"',
            path: orders.policyPath,
            problems: ['"Resource" must be either a valid [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html), or an array of valid ARNs.'],
            line,
            level: 'failure'
          });
        }
      }
    }

  }
  
  return results;
}

function maybeFixCapitalization({ line, lineNumber, regex, correct, policyPath, title='Capitalize this key' }) {
  if (regex.test(line)) {
    return {
      title: 'Statement must be capitalized',
      path: policyPath,
      problems: [suggest(title, line.replace(regex, correct))],
      line: lineNumber,
      level: 'failure'
    }
  }
}

module.exports = policyJsonIsValid;