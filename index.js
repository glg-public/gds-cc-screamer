require("./typedefs");
const core = require("@actions/core");
const github = require("@actions/github");
const checks = require("./checks").all;
const {
  clearPreviousRunComments,
  getAllDeployments,
  suggestBugReport,
  leaveComment,
  httpGet
} = require("./util");

/**
 * Perform all checks on all deployments included in a PR
 */
async function run() {
  const token = core.getInput("token", { required: true });
  const awsAccount = core.getInput("aws_account_id");
  const secretsPrefix = core.getInput("aws_secrets_prefix");
  const awsRegion = core.getInput("aws_region");
  const awsPartition = core.getInput("aws_partition");
  const clusterMap = core.getInput("cluster_map");

  /** @type {ActionInputs} */
  const inputs = { awsAccount, secretsPrefix, awsRegion, awsPartition, clusterMap };

  const octokit = github.getOctokit(token);

  /** @type {PullRequest} */
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

    // These are all of the files that, if changed, will trigger the check suite
    const filesToCheck = ["orders", "secrets.json", "policy.json"];
    const deployments = await getAllDeployments(files, filesToCheck);

    // We want to track how all the checks go
    const counts = {
      success: 0,
      failure: 0,
      warning: 0,
      notice: 0,
    };

    // Run every check against each deployment. Each check can have
    // multiple results. Each result can have multiple problems.
    for (const deployment of deployments) {
      for (const check of checks) {
        let results = [];
        try {
          results = await check(deployment, github.context, inputs, httpGet);
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
          console.log("...Passed");
          counts.success += 1;
          continue;
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
            console.log("...Passed");
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
