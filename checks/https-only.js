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
 * @param {{path: string, contents: Array<string>}} orders
 */
async function httpsOnly(orders) {
  core.info(`HTTPS Only - ${orders.path}`);
  const results = [];

  for (let i = 0; i < orders.contents.length; i++) {
    const line = orders.contents[i];

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
