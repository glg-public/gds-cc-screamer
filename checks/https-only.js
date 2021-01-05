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
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment
 * 
 * @returns {Array<Result>}
 */
async function httpsOnly(deployment) {
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`HTTPS Only - ${deployment.ordersPath}`);
  const results = [];

  for (let i = 0; i < deployment.ordersContents.length; i++) {
    const line = deployment.ordersContents[i];

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
