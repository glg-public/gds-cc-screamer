const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token = core.getInput('token');
    const octokit = github.getOctokit(token);

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(payload.pull_request._links.commits.href);
  } catch (e) {
    core.setFailed(error.message);
  }
}

run();