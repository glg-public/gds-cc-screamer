require('../typedefs');
const core = require("@actions/core");

const dockerdeploy = /^dockerdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const jobdeploy = /^jobdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const autodeploy = /^autodeploy git@github.com:(?<org>[\w-]+)\/(?<repo>.+?)(.git|)#(?<branch>.+)/;
const validCharacters = /^[a-z][a-z0-9-]*$/;

function getDeployment(match) {
  const { source, org, repo, branch, tag } = match.groups;

  return {
    source,
    org,
    repo,
    branch,
    tag,
  };
}

/**
 * Accepts an orders object, and validates the name of the repo and branch
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function validateDeploymentLine(deployment) {
  core.info(`Valid Deployment Line - ${deployment.path}`);

  const problems = [];
  let lineNumber = 0;

  let deploymentParts;

  for (let i = 0; i < deployment.contents.length; i++) {
    const line = deployment.contents[i];
    if (line.startsWith("dockerdeploy")) {
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
        `**${deploymentParts.repo}** - Repository name must be only lowercase alphanumeric characters and hyphens.`
      );
    }

    if (!validCharacters.test(deploymentParts.branch)) {
      problems.push(
        `**${deploymentParts.branch}** - Branch name must be only lowercase alphanumeric characters and hyphens.`
      );
    }

    if (deploymentParts.branch.includes("--")) {
      problems.push(
        `**${deploymentParts.branch}** - Branch name cannot contain \`--\``
      );
    }
  } else if (!deploymentParts && problems.length === 0) {
    problems.push(
      `**${deployment.path}** - Missing deployment. Must include either an \`autodeploy\` line, a \`dockerdeploy\` line, or a \`jobdeploy\` line.`
    );
    lineNumber = 0;
  }

  return [
    {
      title: "Invalid Deployment",
      problems,
      line: lineNumber,
      level: "failure",
    },
  ];
}

module.exports = validateDeploymentLine;
