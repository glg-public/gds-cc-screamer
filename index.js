require("./typedefs");
const core = require("@actions/core");
const github = require("@actions/github");
const checks = require("./checks");
const path = require("path");
const log = require("loglevel");
const {
  clearPreviousRunComments,
  getAllDeployments,
  suggestBugReport,
  leaveComment,
  httpGet,
} = require("./util");

log.setLevel(process.env.LOG_LEVEL || "info");

/**
 * Return an object with user inputs to the action
 * @returns {ActionInputs}
 */
function getInputs() {
  const awsAccount = core.getInput("aws_account_id");
  const secretsPrefix = core.getInput("aws_secrets_prefix");
  const awsRegion = core.getInput("aws_region");
  const awsPartition = core.getInput("aws_partition");
  const clusterMap = core.getInput("cluster_map");
  const numServicesWarnThreshold = core.getInput("num_services_warn");
  const numServicesFailThreshold = core.getInput("num_services_fail");
  const clusterRoot = path.resolve(core.getInput("cluster_root"));
  const deployinatorToken = core.getInput("deployinator_token");
  const deployinatorURL = core.getInput("deployinator_url");
  const restrictedBuckets = core.getInput("restricted_buckets");
  const skipChecks = new Set(core.getInput("skip_checks").split(","));
  const epiqueryTemplatesRepo = core.getInput("epiquery_templates_repo");

  /** @type {ActionInputs} */
  return {
    awsAccount,
    secretsPrefix,
    awsRegion,
    awsPartition,
    clusterMap,
    numServicesFailThreshold,
    numServicesWarnThreshold,
    clusterRoot,
    deployinatorURL,
    deployinatorToken,
    restrictedBuckets,
    skipChecks,
    epiqueryTemplatesRepo,
  };
}

/**
 * Perform all checks on all deployments included in a PR
 */
async function run() {
  const token = core.getInput("token", { required: true });
  const inputs = getInputs();

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
    const filesToCheck = [
      "orders",
      "secrets.json",
      "policy.json",
      "templates.json",
    ];
    const deployments = await getAllDeployments(files, filesToCheck);

    // We want to track how all the checks go
    const counts = {
      success: 0,
      failure: 0,
      warning: 0,
      notice: 0,
    };

    if (
      inputs.deployinatorToken &&
      inputs.deployinatorURL &&
      deployments.length > 0
    ) {
      try {
        const { data } = await httpGet(
          `${inputs.deployinatorURL}/cluster-map.json`,
          {
            headers: {
              authorization: `Bearer ${inputs.deployinatorToken}`,
            },
          }
        );
      } catch ({ error, statusCode }) {
        if (statusCode === 401) {
          delete inputs.deployinatorToken;
          delete inputs.deployinatorURL;
          await leaveComment(
            octokit,
            deployments[0],
            {
              title: "401 From Deployinator API",
              level: "notice",
              line: 0,
              path: deployments[0].ordersPath,
              problems: [
                "CC Screamer received a 401 from the Deployinator API. This most likely indicates an expired or invalid app token. As a result, certain checks will not run, or will run in a degraded fashion.",
              ],
            },
            {
              owner,
              repo,
              pull_number,
              sha,
            }
          );
        }
      }
    }

    // Run every check against each deployment. Each check can have
    // multiple results. Each result can have multiple problems.
    for (const deployment of deployments) {
      for (const checkName of Object.keys(checks)) {
        if (inputs.skipChecks.has(checkName)) {
          log.info(`Skipping ${checkName}`);
          continue;
        }
        const check = checks[checkName];
        let results = [];
        try {
          results = await check(deployment, github.context, inputs, httpGet);
        } catch (e) {
          await suggestBugReport(octokit, e, "Error running check", {
            owner,
            repo,
            pull_number,
          });

          log.info(e);
          continue;
        }
        if (results.length === 0) {
          log.info("...Passed");
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
            log.info("...Passed");
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
