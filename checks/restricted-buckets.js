require("../typedefs");
const log = require("loglevel");
const { getLineWithinObject, escapeRegExp } = require("../util");

const actionString = /(^\*$|^\w+:[\w\*]+$)/;

/**
 * Accepts a deployment object, and does some kind of check
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
 */
async function restrictedBuckets(deployment, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check
   */
  if (!deployment.policyJson) {
    log.info(
      `Missing or invalid policy.json - Skipping ${deployment.serviceName}`
    );
    return [];
  }
  if (!inputs.restrictedBuckets) {
    log.info(
      `No restricted buckets configured - Skipping ${deployment.serviceName}`
    );

    return [];
  }
  log.info(`No Restricted Buckets - ${deployment.policyJsonPath}`);

  /** @type {Array<Result>} */
  const results = [];

  const restricted = inputs.restrictedBuckets.split(",").map((bucket) => {
    return {
      original: bucket,
      regex: new RegExp(
        `^arn:aws:s3:::${bucket
          .replace(/\//g, "\\/")
          .replace(/\?/g)
          .replace(/\*/g, "[\\w\\*\\?]+")}`
      ),
    };
  });

  function _isAboutS3(statement) {
    const { Action } = statement;

    if (typeof Action === "string" && actionString.test(Action)) {
      return Action.startsWith("s3:");
    } else if (Array.isArray(Action)) {
      let isAboutS3 = false;
      Action.filter((item) => actionString.test(item)).forEach((item) => {
        if (item.startsWith("s3:")) {
          isAboutS3 = true;
        }
      });
      return isAboutS3;
    }
  }

  deployment.policyJson.Statement.filter(_isAboutS3)
    .filter((statement) => statement.Effect === "Allow")
    .forEach((statement) => {
      const { Resource } = statement;

      if (typeof Resource === "string") {
        restricted.forEach(({ original, regex }) => {
          if (regex.test(Resource)) {
            const line = getLineWithinObject(
              deployment.policyJsonContents,
              statement,
              new RegExp(escapeRegExp(Resource))
            );
            const result = {
              title: "Accessing a Restricted Bucket",
              level: "failure",
              path: deployment.policyJsonPath,
              line,
              problems: [`Access to s3://${original} is restricted.`],
            };
            results.push(result);
          }
        });
      } else if (Array.isArray(Resource)) {
        Resource.forEach((resource) => {
          restricted.forEach(({ original, regex }) => {
            if (regex.test(resource)) {
              const line = getLineWithinObject(
                deployment.policyJsonContents,
                statement,
                new RegExp(escapeRegExp(resource))
              );

              const result = {
                title: "Accessing a Restricted Bucket",
                level: "failure",
                path: deployment.policyJsonPath,
                line,
                problems: [`Access to s3://${original} is restricted.`],
              };
              results.push(result);
            }
          });
        });
      }
    });

  return results;
}

module.exports = restrictedBuckets;
