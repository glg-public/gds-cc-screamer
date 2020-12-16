require('../typedefs');
const core = require("@actions/core");

/**
 * Accepts an orders object, and does some kind of check
 * @param {Deployment} deployment
 */
async function jwtAccessFlags(deployment) {
  core.info(`JWT Access Flags - ${deployment.path}`);
  const results = [];

  for (let i = 0; i < deployment.contents.length; i++) {
    const line = deployment.contents[i];
    const accessFlags = getExportValue(line, "JWT_ACCESS_FLAGS");
    if (accessFlags && accessFlags.includes("+")) {
      results.push({
        title: "Syntax Error in JWT_ACCESS_FLAGS",
        problems: [
          `Use a \`|\` instead \n\`\`\`suggestion
${line.replace(/\+/g, "|")}
\`\`\``,
        ],
        line: i + 1,
        level: "failure",
      });
    }
  }

  return results;
}

function getExportValue(text, varName) {
  const regex = new RegExp(`^export ${varName}=(.*)`, "mi");
  const match = regex.exec(text);

  if (!match || match.length < 2 || match[1].length < 1) return null;

  const value = match[1].replace(/['|"]/gm, "");
  return value && value.length > 0 ? value : null;
}

module.exports = jwtAccessFlags;
