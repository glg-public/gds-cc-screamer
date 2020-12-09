const core = require('@actions/core');
const { getLinesForJSON, suggest, getLineNumber } = require('../util');

const lowerVersion = /"version"/g;
const lowerStatement = /"statement"/g;
const lowerId = /"id"/g;
const lowerSid = /"sid"/g;
const lowerEffect = /"effect"/g;
const lowerPrincipal = /"principal"/g;
const wrongPrinciple = /"principle"/gi;
const lowerAction = /"action"/g;
const lowerNotAction = /"(notAction|notaction|Notaction)"/g
const lowerResource = /"resource"/g;
const lowerNotResource = /"(notResource|notresource|Notresource)"/g
const lowerCondition = /"condition"/g;

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
  if (acceptableVersions.indexOf(version) === -1) {
    const lineRegex = RegExp(`"Version":\\s*"${version}"`, 'i');
    results.push({
      title: 'Invalid Version',
      path: orders.policyPath,
      problems: [`Version must be one of: ${acceptableVersions.join(', ')}`],
      line: getLineNumber(policyContents, lineRegex),
      level: 'failure'
    });
  }

  // Statement blocks have some required fields
  const statementBlock = policyJson.Statement || policyJson.statement;
  for (let statement of statementBlock) {
    const result = {
      title: 'Statement is missing required fields.',
      path: policyPath,
      problems: [],
      level: 'failure'
    }
    
    if (!(statement.Effect || statement.effect)) {
      result.problems.push('All policy statements must include an "Effect" field. Must be "Allow" or "Deny"');
    }

    let action = statement.Action || statement.action || statement.NotAction || statement.notAction || statement.notaction || statement.Notaction;
    if (!action) {
      result.problems.push('All policy statements must include an "Action" field.');
    } else if (typeof action !== 'string' && !Array.isArray(action)) {
      result.problems.push('The "Action" field must either be a string, or an array of strings.');
    }

    let resource = statement.Resource || statement.resource || statement.NotResource || statement.notResource || statement.notresource || statement.Notresource;
    if (!resource) {
      results.problems.push('All policy statements must include a "Resource" field.')
    } else if (typeof resource !== 'string' && !Array.isArray(resource)) {
      result.problems.push('The "Resource" field must either be a string, or an array of strings.');
    }

    if (result.problems.length > 0) {
      const lines = getLinesForJSON(policyContents, statement);
      if (lines.start === lines.end) {
        result.line = lines.start;
      } else {
        result.line = lines;
      }
      results.push(result);
    }
  }

  for (let statement of statementBlock) {
    let effect = statement.Effect || statement.effect;
    if (["Allow", "Deny"].indexOf(effect) === -1) {
      const blockLineNums = getLinesForJSON(policyJson, statement);
      let line;
      if (blockLineNums.start === blockLineNums.end) {
        line = blockLineNums.start;
      } else {
        const blockLines = policyJson.slice(blockLineNums.start - 1, blockLineNums.end);
        const lineRegex = RegExp(`"Effect":\\s*"${effect}"`, 'i');
        line = getLineNumber(blockLines, lineRegex) + blockLineNums.start - 1;
      }
      
      results.push({
        title: 'Invalid value for "Effect"',
        path: orders.policyPath,
        problems: ['"Effect" must be one of: Allow, Deny'],
        line,
        level: 'failure'
      });
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