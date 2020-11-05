const core = require('@actions/core');

const singleQuoteSubsitution = RegExp("export \\w+='\.*\\$({|)\\w+(}|)\.*'");

/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders 
 */
async function validBashSubsitutions(orders) {
  core.info(`Valid Bash Substitution - ${orders.path}`);
  const results = []

  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];

    if (singleQuoteSubsitution.test(line)) {
      results.push({
        title: 'Bad Substitution',
        problems: [
`You must use double quotes for bash subsitutions.\n\`\`\`suggestion
${line.replace(/'/g, '"')}
\`\`\``
        ],
        line: i+1,
        level: 'failure'
      });
    }
  }

  return results;
}

module.exports = validBashSubsitutions;