require('../typedefs');
const core = require("@actions/core");

const dockerdeploy = /^dockerdeploy (?<source>\w+)\/(?<org>[\w-]+)\/(?<repo>.+?)\/(?<branch>.+?):(?<tag>\w+)/;
const dockerbuild = /^dockerbuild git@github.com:(?<org>[\w-]+)\/(?<repo>.+?)(.git|)#(?<branch>.+)/;
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
 * Accepts a deployment object, and validates the name of the repo and branch.
 * Also validates that there is a valid deployment line
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function validateDeploymentLine(deployment) {
  if (!deployment.ordersContents) {
    console.log(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  console.log(`Valid Deployment Line - ${deployment.ordersPath}`);

  const problems = [];
  let lineNumber = 0;

  let deploymentParts;

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];
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
    } else if (line.startsWith("dockerbuild")) {
      lineNumber = i + 1;
      const match = dockerbuild.exec(line);

      if (!match) {
        problems.push(
          "Incorrect Formatting: must be `dockerbuild git@github.com:<org>/<repo>[.git]#<branch>`"
        );
        break;
      }

      deploymentParts = getDeployment(match);
      break;
    } else if (/^(autodeploy|jobdeploy)\s/.test(line)) {
      lineNumber = i + 1;
      problems.push(
        "GDS China supports \`dockerbuild\` and \`dockerdeploy\` only."
      );
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
        `**${deployment.ordersPath}** - Missing deployment. Must include either an \`dockerbuild\` line, or a \`dockerdeploy\` line.`
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
