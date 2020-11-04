const dockerdeploy = RegExp('^dockerdeploy (?<source>\\w+)\/(?<org>[\\w\-]+)\/(?<repo>[\\w\-_]+)\/(?<branch>[\\w\-_]+):(?<tag>\\w+)');
const autodeploy = RegExp('^autodeploy git@github.com:(?<org>[\\w\-]+)\/(?<repo>[\\w\-_]+)(\.git|)#(?<branch>[\\w\-_]+)');
const validCharacters = RegExp('^[a-z][a-z0-9\-]*');

function getDeployment(match) {
  const {
    source,
    org,
    repo,
    branch,
    tag
  } = match.groups;

  return {
    source,
    org,
    repo,
    branch,
    tag
  }
}


/**
 * Accepts an orders object, and validates the name of the repo and branch
 * @param {{path: string, contents: Array<string>}} orders 
 */
async function validateDeploymentLine(orders) {
  const problems = [];
  let lineNumber = 0;

  let deployment;

  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];
    if (line.startsWith('dockerdeploy')) {
      lineNumber = i + 1;
      const match = dockerdeploy.exec(line);
      
      if (!match) {
        problems.push('Incorrect Formatting: must be `dockerdeploy github/<org>/<repo>/<branch>:<tag>`');
        break;
      }
      
      deployment = getDeployment(match);
      break;
    }
     else if (line.startsWith('autodeploy')) {
       lineNumber = i+1;
       const match = autodeploy.exec(line);

       if (!match) {
         problems.push('Incorrect Formatting: must be `autodeploy git@github.com:<org>/<repo>[.git]:<branch>`');
         break;
       }

       deployment = getDeployment(match);
     }
  }

  if (deployment) {
    if (!validCharacters.test(deployment.repo)) {
      problems.push(`**${deployment.repo}** - Repository name must be only lowercase alphanumeric characters and hyphens.`);
    }

    if (!validCharacters.test(deployment.branch)) {
      problems.push(`**${deployment.branch}** - Branch name must be only lowercase alphanumeric characters and hyphens.`);
    }

    if (deployment.branch.includes('--')) {
      problems.push(`**${deployment.branch}** - Branch name cannot contain \`--\``)
    }
  } 
  
  else if (!deployment && problems.length === 0) {
    problems.push(`**${orders.path}** - Missing deployment. Must include either an \`autodeploy\` line or a \`dockerdeploy\` line.`);
    lineNumber = 0;
  }

  return [{
    title: 'Invalid Deployment',
    problems,
    line: lineNumber,
    fail: true
  }]
}

module.exports = validateDeploymentLine;