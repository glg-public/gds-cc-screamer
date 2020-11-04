const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token = core.getInput('token', {required: true});
    const octokit = github.getOctokit(token);

    const payload = github.context.payload;
    console.log(JSON.stringify(payload.pull_request, undefined, 2));
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();