require("./typedefs");
const core = require("@actions/core");
const path = require("path");
const fs = require("fs").promises;

/**
 *
 * @param {Array<string>} fileLines
 * @param {Object} jsonObj
 *
 * @returns {{
 * start: number,
 * end: number
 * }}
 */
function getLinesForJSON(fileLines, jsonObj) {
  let start = 0;
  let end = 0;

  // Convert the object into a regex
  const regex = new RegExp(
    JSON.stringify(jsonObj)
      .replace(/\?/g, "\\?")
      .replace(/\*/g, "\\*")
      .replace(/{/g, "{\\s*")
      .replace(/:"/g, ':\\s*"')
      .replace(/",/g, '"\\s*,\\s*')
      .replace(/}/g, "\\s*}")
      .replace(/\[/g, "\\s*\\[\\s*")
      .replace(/\],?/g, "\\s*\\],?\\s*")
  );

  for (let i = 0; i < fileLines.length; i++) {
    let text = fileLines[i];

    if (text.trim() === "[") {
      continue;
    }

    start = i + 1;

    if (regex.test(text)) {
      end = start;
      break;
    }

    // If we've reached the end of an object, we start over at the next line
    if (/},*/.test(text)) {
      continue;
    }

    for (let j = i + 1; j < fileLines.length; j++) {
      text += `\n${fileLines[j]}`;
      if (regex.test(text)) {
        end = j + 1;
        return { start, end };
      }

      // If we've reached the end of an object, we start over at the next line
      if (/},*/.test(text)) {
        break;
      }
    }
  }

  return { start, end };
}

/**
 *
 * @param {string} title
 * @param {string} suggestion
 *
 * @returns {string}
 */
function suggest(title, suggestion) {
  return `${title}\n${codeBlock(suggestion, "suggestion")}`;
}

/**
 *
 * @param {Array<string>} fileLines
 * @param {RegExp} regex
 *
 * @return {(number | null)}
 */
function getLineNumber(fileLines, regex) {
  for (let i = 0; i < fileLines.length; i++) {
    if (regex.test(fileLines[i])) {
      return i + 1;
    }
  }
  return null;
}

/**
 *
 * @param {Array<string>} fileLines
 * @param {Object} jsonObj
 * @param {RegExp} regex
 *
 * @returns {(number | null)}
 */
function getLineWithinObject(fileLines, jsonObj, regex) {
  const blockLineNums = getLinesForJSON(fileLines, jsonObj);
  let line = null;
  if (blockLineNums.start === blockLineNums.end) {
    line = blockLineNums.start;
  } else {
    const blockLines = fileLines.slice(
      blockLineNums.start - 1,
      blockLineNums.end
    );
    line = getLineNumber(blockLines, regex) + blockLineNums.start - 1;
  }

  return line;
}

/**
 *
 * @param {{
 * owner: string,
 * repo: string,
 * branch: string,
 * filename: string,
 * value: string
 * }} params
 *
 * @returns {URI}
 */
function getNewFileLink({ owner, repo, branch, filename, value }) {
  return `https://github.com/${owner}/${repo}/new/${branch}?filename=${encodeURIComponent(
    filename
  )}&value=${encodeURIComponent(value)}`;
}

/**
 * Get the owner, repo, and branch for this PR
 * @param {GitHubContext} context The Github Pull Request Context Object
 */
function getOwnerRepoBranch(context) {
  const pr = context.payload.pull_request;
  const owner = pr.head.repo.owner.login;
  const repo = pr.base.repo.name;
  const branch = pr.head.ref;

  return { owner, repo, branch };
}

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
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
 * @param {string} string
 *
 * @returns {string}
 */
function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * Takes in a JSON file, and determines it's indentation
 * @param {Array<string>} file
 *
 * @returns {{
 * amount: number,
 * type: ( 'spaces' | 'tabs' ),
 * indent: string
 * }}
 */
function detectIndentation(fileLines) {
  const tokenTypes = {
    spaces: 0,
    tabs: 0,
  };
  const numIndentation = [];

  fileLines.forEach((line) => {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === " ") {
        tokenTypes.spaces += 1;
      } else if (char === "\t") {
        tokenTypes.tabs += 1;
      } else {
        numIndentation.push(i);
        return;
      }
    }
  });

  const differences = [];
  for (let i = 1; i < numIndentation.length; i++) {
    if (numIndentation[i] > numIndentation[i - 1]) {
      differences.push(numIndentation[i] - numIndentation[i - 1]);
    }
  }

  function _mode(arr) {
    return arr
      .sort(
        (a, b) =>
          arr.filter((v) => v === a).length - arr.filter((v) => v === b).length
      )
      .pop();
  }

  const type = tokenTypes.spaces > tokenTypes.tabs ? "spaces" : "tabs";
  const character = type === "spaces" ? " " : "\t";
  const amount = _mode(differences);

  return {
    amount,
    type,
    indent: character.repeat(amount),
  };
}

/**
 * Takes a filename like secrets.json and returns secretsJson
 * @param {string} filename
 */
function camelCaseFileName(filename) {
  const words = filename.split(".");

  let result = words[0];

  if (words.length > 1) {
    result += words
      .slice(1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join();
  }

  return result;
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

/**
 * Clear any comments from this bot that are already on the PR.
 * This prevents excessive comment polution
 * @param {Octokit} octokit
 * @param {{
 * owner: string,
 * repo: string,
 * pull_number: number
 * }} options
 */
async function clearPreviousRunComments(octokit, { owner, repo, pull_number }) {
  try {
    const { data: reviewComments } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number,
    });

    const { data: issueComments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: pull_number,
    });

    const allDeletions = [];

    reviewComments
      .filter(
        (c) => c.user.login === "github-actions[bot]" && c.user.type === "Bot"
      )
      .forEach((comment) => {
        allDeletions.push(
          octokit.pulls.deleteReviewComment({
            owner,
            repo,
            comment_id: comment.id,
          })
        );
      });

    issueComments
      .filter(
        (c) => c.user.login === "github-actions[bot]" && c.user.type === "Bot"
      )
      .forEach((comment) => {
        allDeletions.push(
          octokit.issues.deleteComment({
            owner,
            repo,
            comment_id: comment.id,
          })
        );
      });

    await Promise.all(allDeletions);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

function getNewIssueLink({ linkText, owner, repo, title, body }) {
  return `[${linkText}](https://github.com/${owner}/${repo}/issues/new?title=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(body)})`;
}

function codeBlock(text, type="") {
  return `\`\`\`${type}\n${text}\n\`\`\``;
}

/**
 * Submits an issue comment on the PR which contains
 * a link to a pre-populated bug report on this
 * repository.
 * @param {Octokit} octokit
 * @param {Error} error
 * @param {string} title
 * @param {{
 * owner: string,
 * repo: string,
 * pull_number: number,
 * }} options
 */
async function suggestBugReport(
  octokit,
  error,
  title,
  { owner, repo, pull_number: issue_number }
) {
  const errorText = codeBlock(`${error.message}\n\n${error.stack}`);
  const issueLink = getNewIssueLink({
    linkText: "Create an issue",
    owner: "glg-public",
    repo: "gds-cc-screamer",
    title,
    body: errorText
  });
  
  const body = `## An error was encountered. Please submit a bug report\n${errorText}\n\n${issueLink}\n`;
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number,
    body,
  });
}

/**
 * Leaves the correct type of comment for a given result and deployment
 * @param {Octokit} octokit A configured octokit client
 * @param {Deployment} deployment
 * @param {Result} result
 * @param {{
 * owner: string,
 * repo: string,
 * pull_number: number,
 * sha: string
 * }} options
 */
async function leaveComment(
  octokit,
  deployment,
  result,
  { owner, repo, pull_number, sha }
) {
  const { ordersPath, secretsPath, policyPath } = deployment;

  // Emojis are fun
  const icons = {
    failure: "💀",
    warning: "⚠️",
    notice: "👉",
  };

  // Build a markdown comment to post
  let comment = `## ${icons[result.level]} ${result.title}\n`;
  for (const problem of result.problems) {
    comment += `- ${problem}\n`;
    core.error(`${result.title} - ${problem}`);
  }
  try {
    // Line 0 means a general comment, not a line-specific comment
    if (result.line === 0) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: comment,
      });
    }

    // If result.line is a range object like { start, end }, make a multi-line comment
    else if (
      isNaN(result.line) &&
      result.line.hasOwnProperty("start") &&
      result.line.hasOwnProperty("end")
    ) {
      await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        commit_id: sha,
        path: result.path || ordersPath || secretsPath || policyPath,
        body: comment,
        side: "RIGHT",
        start_line: result.line.start,
        line: result.line.end,
      });
    }

    // If line number is anything but 0, or a range object, we make a line-specific comment
    else {
      await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        commit_id: sha,
        path: result.path || ordersPath || secretsPath || policyPath,
        body: comment,
        side: "RIGHT",
        line: result.line,
      });
    }
  } catch (e) {
    // If the error is due to the problem existing outside the diff,
    // we still want to alert the user, so make a generic issue comment
    if (
      e.errors.filter(
        (err) =>
          err.resource === "PullRequestReviewComment" &&
          ["path", "line"].includes(err.field)
      ).length > 0
    ) {
      result.problems.unshift(
        `Problem existed outside of diff at \`${result.path}\`, line **${result.line}**`
      );
      result.line = 0;
      await leaveComment(octokit, deployment, result, {
        owner,
        repo,
        pull_number,
        sha,
      });
    } else {
      console.log(e);
      console.log(result);
      await suggestBugReport(octokit, e, "Error while posting comment", {
        owner,
        repo,
        pull_number,
      });
    }
  }
}

/**
 *
 * @param {Array<GitHubFile>} files
 * @param {Array<string>} filesToCheck
 *
 * @returns {Array<Deployment>}
 */
async function getAllDeployments(files, filesToCheck) {
  return Promise.all(
    Array.from(
      new Set(
        files
          .filter((f) =>
            filesToCheck.includes(path.basename(f.filename).toLowerCase())
          )
          .filter((f) => f.status !== "removed")
          .map((f) => path.dirname(f.filename))
      )
    ).map((serviceName) => getContents(serviceName, filesToCheck))
  );
}

function getExportValue(text, varName) {
  const regex = new RegExp(`^export ${varName}=(.*)`, "mi");
  const match = regex.exec(text);

  if (!match || match.length < 2 || match[1].length < 1) return null;

  const value = match[1].replace(/['|"]/gm, "");
  return value && value.length > 0 ? value : null;
}

module.exports = {
  getLinesForJSON,
  suggest,
  getLineNumber,
  getLineWithinObject,
  getNewFileLink,
  getOwnerRepoBranch,
  isAJob,
  escapeRegExp,
  detectIndentation,
  leaveComment,
  suggestBugReport,
  getAllDeployments,
  clearPreviousRunComments,
  getContents,
  camelCaseFileName,
  getExportValue,
  getNewIssueLink,
  codeBlock
};
