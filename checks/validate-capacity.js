require("../typedefs");
const log = require("loglevel");
const {
  getExportValue,
  getLineNumber,
  isAJob,
  getClusterType,
  escapeRegExp,
} = require("../util");

const checkMsg = "Maximum capacity cannot be less than minimum capacity.";

/**
 * The default value of ECS_TASK_MAX_CAPACITY is 4 and the default value of ECS_TASK_MIN_CAPACITY is 2.
 * User may have given the value to ECS_TASK_MAX_CAPACITY, which is lower than the default value of
 * ECS_TASK_MIN_CAPACITY, which will therefore cause deployment failure with following error messages:
 * Error creating application autoscaling target: ValidationException: Maximum capacity cannot be less than minimum capacity
 *
 * @param {Deployment} deployment An object containing information about a deployment
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet
 *
 * @returns {Array<Result>}
*/

async function validateCapcity(deployment, context, inputs, httpGet) {

  const extractMaxCapcity = getExportValue(
    deployment.ordersContents.join("\n"),
    "ECS_TASK_MAX_CAPACITY"
  );

  const extractMinCapcity = getExportValue(
    deployment.ordersContents.join("\n"),
    "ECS_TASK_MIN_CAPACITY"
  );

  /** @type {Array<Result>} */
  const results = [];
  const problems = [];
  let allowed = false;

  const ecsTaskMaxCapcity = parseInt(!extractMaxCapcity ? 4 : extractMaxCapcity);
  const ecsTaskMinCapcity = parseInt(!extractMinCapcity ? 2 : extractMinCapcity);
  
  if (ecsTaskMaxCapcity >= ecsTaskMinCapcity) {
    allowed = true;
  }

  if (!allowed) {

    if (extractMaxCapcity && !extractMinCapcity) {
      // Below is the message when developer has set the override value of ECS_TASK_MAX_CAPACITY, the value is less than the default value of ECS_TASK_MIN_CAPACITY.
      problems.push(
        `The value of **ECS_TASK_MAX_CAPACITY** is less than the default value of **ECS_TASK_MIN_CAPACITY**, click [here](https://blog.glgresearch.com/know/glg-deployment-system-gds/cluster-configuration/#env-ecs_task_min_capacity) to find the default value.`
      );
    }

    if (extractMaxCapcity && !extractMinCapcity) {
      // Below is the message when developer has set the override value of ECS_TASK_MIN_CAPACITY, the value is greater than the default value of ECS_TASK_MAX_CAPACITY.
      problems.push(
        `The value of **ECS_TASK_MIN_CAPACITY** is greater than the default value of **ECS_TASK_MAX_CAPACITY**, click [here](https://blog.glgresearch.com/know/glg-deployment-system-gds/cluster-configuration/#env-ecs_task_max_capacity) to find the default value.`
      );
    }

    if (!extractMaxCapcity && !extractMinCapcity) {
      // Below message should be poped when developer has set the override value to both ECS_TASK_MAX_CAPACITY and ECS_TASK_MIN_CAPACITY.
      problems.push(
        `Value of **ECS_TASK_MAX_CAPACITY** cannot be less than **ECS_TASK_MIN_CAPACITY**.`
      );
    }
  };

  if (problems.length > 0) {
    const exportRegex = !extractMaxCapcity ? /export ECS_TASK_MAX_CAPACITY=/ : /export ECS_TASK_MIN_CAPACITY=/;
    const line = getLineNumber(deployment.ordersContents, exportRegex);
    results.push({
      title: checkMsg,
      line,
      level: "failure",
      path: deployment.ordersContents,
      problems,
    });
  }

  return results;
}

module.exports = validateCapcity;
