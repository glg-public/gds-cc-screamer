const core = require('@actions/core');
const github = require('@actions/github');
const path = require('path');
const fs = require('fs').promises;
const checks = require('./checks');

async function getContents(filePath) {
  const contents = await fs.readFile(filePath, 'utf8');
  return { path: filePath, contents: contents.split('\n') };
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
      .map(f => f.filename)
      .map(fn => getContents(fn))
    );

    for (const order of orders) {
      for (const check of checks) {
        const results = await(check(order));
        for (const result of results) {
          if (result.problems.length > 0) {
            let comment = `## ${result.check}\n`;
            for (const problem of result.problems) {
              comment += `- ${problem}\n`
            }
  
            await octokit.pulls.createReviewComment({
              owner,
              repo,
              pull_number,
              commit_id: sha,
              path: order.path,
              body: comment,
              side: 'RIGHT',
              line: result.line
            });
          }
        }
        }
        
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();