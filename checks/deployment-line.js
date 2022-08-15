require("../typedefs");
const log = require("loglevel");

const dockerdeploy =
  /^dockerdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/((?<path>[\w\-\/]+)\/)?(?<branch>.+?):(?<tag>\w+)/;
const jobdeploy =
  /^jobdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>[^:]+):?(?<tag>[\w-]*)/;
const autodeploy =
  /^autodeploy\s+(git@github.com:|https:\/\/github\.com\/)(?<org>[\w-]+)\/(?<repo>[^#\.]+)(\.git|)#?(?<branch>.*)/;
const validCharacters = /^[a-z][a-z0-9-]*$/;

function getDeployment(match) {
  const { source, org, repo, path, branch, tag } = match.groups;

  return {
    source,
    org,
    repo,
    path,
    branch,
    tag: tag || "latest",
  };
}

/**
 * Accepts a deployment object, and validates the name of the repo and branch.
 * Also validates that there is a valid deployment line
 * @param {Deployment} deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function validateDeploymentLine(deployment, context, inputs, httpGet) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`Valid Deployment Line - ${deployment.ordersPath}`);

  const problems = [];
  let lineNumber = 0;

  let deploymentParts;
  let deploymentType;

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];
    if (line.startsWith("dockerdeploy")) {
      deploymentType = "dockerdeploy";
      lineNumber = i + 1;
      const match = dockerdeploy.exec(line);

      if (!match) {
        problems.push(
          "Incorrect Formatting: must be `dockerdeploy github/<org>/<repo>/<branch>:<tag>`"
        );
        break;
      }

      deploymentParts = getDeployment(match);
      break;
    } else if (line.startsWith("autodeploy")) {
      deploymentType = "autodeploy";
      lineNumber = i + 1;
      const match = autodeploy.exec(line);

      if (!match) {
        problems.push(
          "Incorrect Formatting: must be `autodeploy git@github.com:<org>/<repo>[.git]#<branch>`"
        );
        break;
      }

      deploymentParts = getDeployment(match);
    } else if (line.startsWith("jobdeploy")) {
      deploymentType = "jobdeploy";
      lineNumber = i + 1;
      const match = jobdeploy.exec(line);

      if (!match) {
        problems.push(
          "Incorrect Formatting: must be `jobdeploy github/<org>/<repo>/<branch>:<tag>`"
        );
        break;
      }

      deploymentParts = getDeployment(match);
      break;
    }
  }

  if (deploymentParts) {
    if (!validCharacters.test(deploymentParts.repo)) {
      problems.push(
        `**${deploymentParts.repo}** - Repository name must be only lowercase alphanumeric characters and hyphens. [Reason: AWS Restrictions](https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_Repository.html)`
      );
    }

    if (!validCharacters.test(deploymentParts.branch)) {
      problems.push(
        `**${deploymentParts.branch}** - Branch name must be only lowercase alphanumeric characters and hyphens. [Reason: AWS Restrictions](https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_Repository.html)`
      );
    }

    if (deploymentParts.branch.includes("--")) {
      problems.push(
        `**${deploymentParts.branch}** - Branch name cannot contain \`--\``
      );
    }
  } else if (!deploymentParts && problems.length === 0) {
    problems.push(
      `**${deployment.ordersPath}** - Missing deployment. Must include either an \`autodeploy\` line, a \`dockerdeploy\` line, or a \`jobdeploy\` line.`
    );
    lineNumber = 0;
  }

  let level = "failure";
  let title = "Invalid Deployment";

  if (
    problems.length === 0 &&
    deploymentParts &&
    inputs.deployinatorToken &&
    inputs.deployinatorURL
  ) {
    const httpOpts = {
      headers: {
        Authorization: `Bearer ${inputs.deployinatorToken}`,
      },
    };

    const { org: owner, repo, path, branch, tag } = deploymentParts;

    if (deploymentType === "autodeploy") {
      const url = `${inputs.deployinatorURL}/enumerate/branches?owner=${owner}&repo=${repo}`;
      try {
        const { data: branches } = await httpGet(url, httpOpts);
        if (!branches.includes(branch)) {
          problems.push(
            `The specified repo \`${owner}/${repo}\` does not have a branch named \`${branch}\``,
            `Sometimes this happens because of a stale cache. You can try [refreshing the cache](${url}&bust=true), and then re-running this check suite.`
          );
        }
      } catch ({ error, statusCode }) {
        if (statusCode === 401) {
          title = "401 From Deployinator API";
          problems.push(
            "CC Screamer received a 401 from the Deployinator API. This most likely indicates an expired or invalid app token."
          );
          level = "notice";
        } else if (statusCode === 404) {
          problems.push(
            `The specified repo \`${deploymentParts.org}/${deploymentParts.repo}\` could not be found.`,
            `Sometimes this happens because of a stale cache. You can try [refreshing the cache](${url}&bust=true), and then re-running this check suite.`
          );
        } else if (statusCode >= 500) {
          title = "Internal Server Error";
          level = "notice";
          problems.push(
            "An unknown error was encountered while accessing the Deployinator API. Please manually confirm the existence of the repo and branch you are deploying."
          );
        } else {
          throw new Error(error);
        }
      }
    } else {
      const image = `github/${owner}/${repo}/${path ? path + "/" : "" }${branch}`;
      let url = `${inputs.deployinatorURL}/enumerate/ecr/tags?image=${image}`;
      if (inputs.awsAccount && inputs.awsAccount !== "*") {
        url += `&account=${inputs.awsAccount}`;
      }
      try {
        const { data: tags } = await httpGet(url, httpOpts);
        if (!tags.includes(tag)) {
          problems.push(
            `The docker image \`${image}\` does not have a tag named \`${tag}\``,
            `Sometimes this happens because of a stale cache. You can try [refreshing the cache](${url}&bust=true), and then re-running this check suite.`,
            `[More About Deploying To GDS](https://services.glgresearch.com/know/glg-deployment-system-gds/deploying-a-service/)`
          );
        }
      } catch ({ error, statusCode }) {
        if (statusCode === 401) {
          title = "401 From Deployinator API";
          problems.push(
            "CC Screamer received a 401 from the Deployinator API. This most likely indicates an expired or invalid app token."
          );
          level = "notice";
        } else if (statusCode === 404) {
          problems.push(
            `The specified docker image \`${image}:${tag}\` could not be found.`,
            `Sometimes this happens because of a stale cache. You can try [refreshing the cache](${url}&bust=true), and then re-running this check suite.`,
            `[More About Deploying To GDS](https://services.glgresearch.com/know/glg-deployment-system-gds/deploying-a-service/)`
          );
        } else if (statusCode >= 500) {
          title = "Internal Server Error";
          level = "notice";
          problems.push(
            "An unknown error was encountered while accessing the Deployinator API. Please manually confirm the existence of the repo and branch you are deploying."
          );
        } else {
          log.error(JSON.stringify({ statusCode, error }));
          throw new Error(error);
        }
      }
    }
  }

  return [
    {
      title,
      path: deployment.ordersPath,
      problems,
      line: lineNumber,
      level,
    },
  ];
}

module.exports = validateDeploymentLine;
