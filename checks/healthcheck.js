const core = require('@actions/core');

/**
 * Accepts an orders object, and validates the healthcheck
 * @param {{path: string, contents: Array<string>}} orders 
 */
async function validateHealthcheck(orders) {
  core.info(`Valid Health Check - ${orders.path}`);

  const problems = [];
  let lineNumber = 0;

  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];

    if (line.startsWith('export HEALTHCHECK')) {
      const [_, healthcheck] = line.split('=');
      lineNumber = i+1;

      if (healthcheck.length === 0 || healthcheck === '""' || healthcheck === "''") {
        problems.push('You must set a healthcheck, and it cannot be at `/`');
      }

      if (healthcheck === "/" || healthcheck === '"/"' || healthcheck === "'/'") {
        problems.push(`**${healthcheck}** - Your healthcheck cannot be at root.`);
      }

      break;
    }
  }

  if (lineNumber === 0) {
    problems.push(`**${orders.path}** - You must set a healthcheck, and it cannot be at \`/\``);
  }

  return [{
    title: 'Invalid Healthcheck',
    problems,
    line: lineNumber,
    level: 'failure'
  }];
}

module.exports = validateHealthcheck;