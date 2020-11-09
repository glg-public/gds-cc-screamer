const core = require('@actions/core');

const exportLine = /^export\s(?<variable>.*?)\s*=\s*(?<value>.*)/i

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders
 * @param {Object} context The context object provided by github 
 */
async function noSpacesInExports(orders, context) {
  core.info(`No Spaces in Exports - ${orders.path}`);
  const results = [];

  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];
    const match = exportLine.exec(line);
    if(!match) {
      continue;
    }

    if (line.includes(" =") || line.includes("= ")) {
      const { variable, value } = match.groups;
      results.push({
        title: 'No Spaces in Exports',
        problems: [
`Trim out this whitespace\n\`\`\`suggestion
export ${variable}=${value}
\`\`\``
        ],
        line: i+1,
        level: 'failure'
      });
    }
  }

  return results;
}

module.exports = noSpacesInExports;