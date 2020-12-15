const core = require("@actions/core");
const github = require("@actions/github");
const path = require("path");
const fs = require("fs").promises;
const checks = require("./checks");

/**
 * Read orders, secrets.json, and policy.json from the directory,
 * and split them by \n.
 * @param {String} filePath the path for the orders file
 * @returns {{
 * path: string,
 * contents: Array<string>,
 * secretsPath: (string|undefined),
 * secretsContents: (Array<string>|undefined),
 * policyPath: (string|undefined),
 * policyContents: (Array<string>|undefined)
 * }}
 */
async function getContents(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  const result = { path: filePath, contents: contents.split("\n") };
  const secretsJsonPath = path.join(path.dirname(filePath), "secrets.json");
  const policyJsonPath = path.join(path.dirname(filePath), "policy.json");

  try {
    await fs.stat(secretsJsonPath);
    const secretsJson = await fs.readFile(secretsJsonPath, "utf8");
    result.secretsContents = secretsJson.split("\n");
    result.secretsPath = secretsJsonPath;
  } catch (e) {
    // secrets.json is not required
  }

  try {
    await fs.stat(policyJsonPath);
    const policyJson = await fs.readFile(policyJsonPath, "utf8");
    result.policyContents = policyJson.split("\n");
    result.policyPath = policyJsonPath;
  } catch (e) {
    // policy.json is not required
  }

  return result;
}

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

async function run() {
  try {
    const token = core.getInput("token", { required: true });
    const awsAccount = core.getInput("aws_account_id");
    const secretsPrefix = core.getInput("aws_secrets_prefix");
    const awsRegion = core.getInput("aws_region");
    const inputs = { awsAccount, secretsPrefix, awsRegion };

    const octokit = github.getOctokit(token);

    const pr = github.context.payload.pull_request;
    const owner = pr.base.repo.owner.login;
    const repo = pr.base.repo.name;
    const pull_number = pr.number;
    const sha = pr.head.sha;

    await clearPreviousRunComments(octokit, { owner, repo, pull_number });

    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });

    const deployments = await Promise.all(
      files
        .filter((f) => path.basename(f.filename).toLowerCase() === "orders")
        .filter((f) => f.status !== "removed")
        .map((f) => f.filename)
        .map((fn) => getContents(fn))
    );

    const counts = {
      success: 0,
      failure: 0,
      warning: 0,
      notice: 0,
    };

    const icons = {
      failure: "💀",
      warning: "⚠️",
      notice: "👉",
    };

    // Run every check against each deployment. Each check can have
    // multiple results.
    for (const deployment of deployments) {
      for (const check of checks) {
        let results;
        try {
          results = await check(deployment, github.context, inputs);
        } catch (e) {
          console.log(e);
          continue;
        }
        if (results.length === 0) {
          core.info("...Passed");
        }
        for (const result of results) {
          if (result.problems.length > 0) {
            counts[result.level] += 1;

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
                  path: result.path || deployment.path,
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
                  path: result.path || deployment.path,
                  body: comment,
                  side: "RIGHT",
                  line: result.line,
                });
              }
            } catch (e) {
              console.log(e);
              console.log(result);
            }
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
    core.setFailed(error.message);
  }
}

run();
