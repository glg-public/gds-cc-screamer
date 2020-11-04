const core = require('@actions/core');
const github = require('@actions/github');
const path = require('path');
const fs = require('fs').promises;

async function getContents(filePath) {
  const contents = await fs.readFile(filePath, 'utf8');
  return contents;
}

async function run() {
  try {
    const token = core.getInput('token', {required: true});
    const octokit = github.getOctokit(token);

    const pr = github.context.payload.pull_request;
    const owner = pr.base.repo.owner.login;
    const repo = pr.base.repo.name;
    const pull_number = pr.number;

    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number
    });
    
    const orders = files
      .filter(f => path.basename(f.filename).toLowerCase() === "orders")
      .map(f => f.filename)
      .map(fn => { 
        return { 
          name: fn, 
          contents: await getContents(fn)
        }
      });

    console.log(orders)

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();