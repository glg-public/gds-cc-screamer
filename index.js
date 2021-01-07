require("./typedefs");
const core = require("@actions/core");
const github = require("@actions/github");
const path = require("path");
const fs = require("fs").promises;
const checks = require("./checks");

// These are all of the files that, if changed, will trigger the check suite
const filesToCheck = ["orders", "secrets.json", "policy.json"];

// We want to track how all the checks go
const counts = {
  success: 0,
  failure: 0,
  warning: 0,
  notice: 0,
};

// Emojis are fun
const icons = {
  failure: "💀",
  warning: "⚠️",
  notice: "👉",
};

/**
 * Takes a filename like secrets.json and returns secretsJson
 * @param {string} filename
 */
function _camelCaseFileName(filename) {
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
async function getContents(serviceName) {
  const result = { serviceName };
  for (let filename of filesToCheck) {
    const filepath = path.join(serviceName, filename);
    try {
      await fs.stat(filepath);
      const contents = await fs.readFile(filepath, "utf8");
      result[`${_camelCaseFileName(filename)}Path`] = filepath;
      result[`${_camelCaseFileName(filename)}Contents`] = contents.split("\n");
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

async function suggestBugReport(
  octokit,
  error,
  title,
  { owner, repo, pull_number: issue_number }
) {
  const errorText = `\`\`\`\n${error.message}\n\n${error.stack}\n\`\`\``;
  const issueLink = `[Create an issue](https://github.com/glg-public/gds-cc-screamer/issues/new?title=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(errorText)})`;
  const body = `## An error was encountered. Please submit a bug report
${errorText}

${issueLink}
  `;
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
      errors.filter(
        (err) =>
          err.resource === "PullRequestReviewComment" &&
          ["path", "line"].includes(e.field)
      ).length > 0
    ) {
      result.line = 0;
      await leaveComment(octokit, deployment, result, {
        owner,
        repo,
        pull_number,
        shall,
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
 * Perform all checks on all deployments included in a PR
 */
async function run() {
  const token = core.getInput("token", { required: true });
  const awsAccount = core.getInput("aws_account_id");
  const secretsPrefix = core.getInput("aws_secrets_prefix");
  const awsRegion = core.getInput("aws_region");
  const awsPartition = core.getInput("aws_partition");
  const inputs = { awsAccount, secretsPrefix, awsRegion, awsPartition };

  const octokit = github.getOctokit(token);

  const pr = github.context.payload.pull_request;
  const owner = pr.base.repo.owner.login;
  const repo = pr.base.repo.name;
  const pull_number = pr.number;
  const sha = pr.head.sha;
  try {
    await clearPreviousRunComments(octokit, { owner, repo, pull_number });

    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });

    const deployments = await Promise.all(
      Array.from(
        new Set(
          files
            .filter((f) =>
              filesToCheck.includes(path.basename(f.filename).toLowerCase())
            )
            .filter((f) => f.status !== "removed")
            .map((f) => path.dirname(f.filename))
        )
      ).map((fn) => getContents(fn))
    );

    // Run every check against each deployment. Each check can have
    // multiple results.
    for (const deployment of deployments) {
      for (const check of checks) {
        let results;
        try {
          results = await check(deployment, github.context, inputs);
        } catch (e) {
          await suggestBugReport(octokit, e, "Error running check", {
            owner,
            repo,
            pull_number,
          });

          console.log(e);
          continue;
        }
        if (results.length === 0) {
          core.info("...Passed");
          counts.success += 1;
        }
        for (const result of results) {
          if (result.problems.length > 0) {
            counts[result.level] += 1;
            await leaveComment(octokit, deployment, result, {
              owner,
              repo,
              pull_number,
              sha,
            });
          } else {
            counts.success += 1;
            core.info("...Passed");
          }
        }
      }
    }

    if (counts.failure > 0) {
      core.setFailed("One or more checks has failed. See comments in PR.");
    }
  } catch (error) {
    await suggestBugReport(octokit, error, "Error Running Check Suite", {
      owner,
      repo,
      pull_number,
    });
    core.setFailed(error.message);
  }
}

run();
