const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token = core.getInput('token', {required: true});
    const octokit = github.getOctokit(token);

    const payload = github.context.payload;
    console.log(payload.pull_request._links.commits.href);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();