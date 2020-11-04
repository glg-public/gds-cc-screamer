const core = require('@actions/core');
const github = require('@actions/github');

try {
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(payload);
} catch (e) {
  core.setFailed(error.message);
}