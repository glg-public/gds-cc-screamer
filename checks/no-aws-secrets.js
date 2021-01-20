require("../typedefs");
const core = require("@actions/core");

/**
 * These regular expressions for finding aws access key id
 * and secret access key are derived from this AWS blog:
 *
 * https://aws.amazon.com/blogs/security/a-safer-way-to-distribute-aws-credentials-to-ec2/
 */
const AKID = /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/;
const SAK = /(?<![A-Za-z0-9/+])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/;
const AKID_ENVVAR = /^export AWS_ACCESS_KEY_ID=/;
const SAK_ENVVAR = /^export AWS_SECRET_ACCESS_KEY=/;

/**
 * Checks for AWS Access Key ID and AWS Secret Access Key
 * @param {Deployment} deployment An object containing information about a deployment
 *
 * @returns {Array<Result>}
 */
async function noAWSSecrets(deployment) {
  if (!deployment.ordersContents) {
    core.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }
  core.info(`No AWS Secrets - ${deployment.ordersPath}`);
  const results = [];

  deployment.ordersContents.forEach((line, i) => {
    const lineNumber = i + 1;

    const result = {
      title: "Remove AWS Config from your orders file.",
      line: lineNumber,
      level: "warning",
      problems: [],
      path: deployment.ordersPath,
    };

    if (AKID_ENVVAR.test(line) || SAK_ENVVAR.test(line)) {
      result.problems.push(
        "You should rely on the container's role, which you can define with `policy.json`, rather than explicitly declaring AWS credentials."
      );
    }

    if (AKID.test(line)) {
      result.level = "failure";
      result.problems.push("Remove this Access Key ID from your orders file.");
    }

    if (SAK.test(line)) {
      result.level = "failure";
      result.problems.push(
        "Remove this Secret Access Key from your orders file."
      );
    }

    if (result.problems.length > 0) {
      results.push(result);
    }
  });

  return results;
}

module.exports = noAWSSecrets;
