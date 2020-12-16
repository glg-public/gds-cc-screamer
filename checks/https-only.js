require('../typedefs');
const core = require("@actions/core");

const SECURE_DOMAINS = ["glgresearch.com", "glg.it", "glginsights.com"];

const reBadURLs = new RegExp(
  `^export +\\w+=[\'\"]?(http:)?\/\/[^\/]*\\.?(?:${SECURE_DOMAINS.map((x) =>
    x.replace(/\./g, "\\.")
  ).join("|")})`,
  "i"
);

/**
 * Accepts an orders object, and does some kind of check
 * @param {Deployment} deployment
 */
async function httpsOnly(deployment) {
  core.info(`HTTPS Only - ${deployment.path}`);
  const results = [];

  for (let i = 0; i < deployment.contents.length; i++) {
    const line = deployment.contents[i];

    if (reBadURLs.test(line)) {
      const result = {
        title: "HTTPS Only",
        problems: [
          `Use HTTPS for all requests to GLG domains\n\`\`\`suggestion
${line.replace(/http:/i, "https:")}
\`\`\``,
        ],
        line: i + 1,
        level: "failure",
      };

      results.push(result);
    }
  }

  return results;
}

module.exports = httpsOnly;
