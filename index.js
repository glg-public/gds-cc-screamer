const core = require('@actions/core');
const github = require('@actions/github');
const path = require('path');
const fs = require('fs').promises;
const checks = require('./checks');

async function getContents(filePath) {
  const contents = await fs.readFile(filePath, 'utf8');
  const result = { path: filePath, contents: contents.split('\n') };
  const secretsJsonPath = path.join(path.dirname(filePath), 'secrets.json');

  // secrets.json is not required
  if (fs.existsSync(secretsJsonPath)) {
    const secretsJson = await fs.readFile(secretsJsonPath, 'utf8');
    results.secretsContents = secretsJson.split('\n');
    results.secretsPath = secretsJsonPath;
  }
  return result;
}

async function run() {
  try {
    const token = core.getInput('token', {required: true});
    const octokit = github.getOctokit(token);

    const pr = github.context.payload.pull_request;
    const owner = pr.base.repo.owner.login;
    const repo = pr.base.repo.name;
    const pull_number = pr.number;
    const sha = pr.head.sha;

    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number
    });
    
    const orders = await Promise.all(files
      .filter(f => path.basename(f.filename).toLowerCase() === "orders")
      .filter(f => f.status !== 'removed')
      .map(f => f.filename)
      .map(fn => getContents(fn))
    );

    const counts = {
      success: 0,
      failure: 0,
      warning: 0,
      notice: 0
    };

    const icons = {
      failure: '💀',
      warning: '⚠️',
      notice: '👉'
    }

    // Run every check against each orders object. Each check can have
    // multiple results.
    for (const order of orders) {
      for (const check of checks) {
        const results = await(check(order, github.context));
        if (results.length === 0) {
          core.info('...Passed');
        }
        for (const result of results) {
          if (result.problems.length > 0) {
            counts[result.level] += 1;

            // Build a markdown comment to post
            let comment = `## ${icons[result.level]} ${result.title}\n`;
            for (const problem of result.problems) {
              comment += `- ${problem}\n`
              core.error(`${result.title} - ${problem}`);
            }

            // Line 0 means a general comment, not a line-specific comment
            if (result.line === 0) {
              await octokit.issues.createComment({
                owner,
                repo,
                issue_number: pull_number,
                body: comment,
              });
            } 

            // If result.line is a range object, make a multi-line comment
            else if (isNaN(result.line) && result.line.hasOwnProperty("name") && result.line.hasOwnProperty()) {
              await octokit.pulls.createReviewComment({
                owner,
                repo,
                pull_number,
                commit_id: sha,
                path: result.path || order.path,
                body: comment,
                side: 'RIGHT',
                start_line: result.line.start,
                line: result.line.end
              });
            }
            
            // If line number is anything but 0, or a range object, we make a line-specific comment
            else {
              await octokit.pulls.createReviewComment({
                owner,
                repo,
                pull_number,
                commit_id: sha,
                path: result.path || order.path,
                body: comment,
                side: 'RIGHT',
                line: result.line
              });
            }
          } else {
            counts.success += 1;
            core.info('...Passed');
          }
        }
      }
    }

    if (counts.failure > 0) {
      core.setFailed('One or more checks has failed. See comments in PR.');
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();