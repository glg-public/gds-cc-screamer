require("../typedefs");
const log = require("loglevel");

const SECURE_DOMAINS = ["glgresearch.com", "glg.it", "glginsights.com"];

const reBadURLs = new RegExp(
  `^export +\\w+=[\'\"]?(http:)?\/\/[^\/]*\\.?(?:${SECURE_DOMAINS.map((x) =>
    x.replace(/\./g, "\\.")
  ).join("|")})`,
  "i"
);

/**
 * Requires that all urls from our domains are https
 * @param {Deployment} deployment
 *
 * @returns {Array<Result>}
 */
async function httpsOnly(deployment) {
  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  log.info(`HTTPS Only - ${deployment.ordersPath}`);

  /** @type {Array<Result>} */
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    if (reBadURLs.test(line)) {
      const result = {
        title: "HTTPS Only",
        path: deployment.ordersPath,
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
  });

  return results;
}

module.exports = httpsOnly;
