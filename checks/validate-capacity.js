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
 *
 * @returns {Array<Result>}
*/

async function validateCapacity(deployment) {

  if (!deployment.ordersContents) {
    log.info(`No Orders Present - Skipping ${deployment.serviceName}`);
    return [];
  }

  const defaultEcsTaskMaxCapacity = 4;
  const defaultEcsTaskMinCapacity = 2;

  const flattenedOrder=deployment.ordersContents.join("\n");

  const hasMax = /export\s+ECS_TASK_MAX_CAPACITY=["|']?(\d+)["|']?/.test(flattenedOrder);
  const hasMin = /export\s+ECS_TASK_MIN_CAPACITY=["|']?(\d+)["|']?/.test(flattenedOrder);

  // when there is no value has been defined, we shall go with default value, we can skip this check.
  if (!hasMax && !hasMin) {
    log.info(`No custom value has been defined - Skipping ${deployment.serviceName}`);
    return[];
  };


  const ecsTaskMaxCapacity = !hasMax ? defaultEcsTaskMaxCapacity : parseInt(flattenedOrder.match(/export\s+ECS_TASK_MAX_CAPACITY=["|']?(\d+)["|']?/)[1]);
  const ecsTaskMinCapacity = !hasMin ? defaultEcsTaskMinCapacity : parseInt(flattenedOrder.match(/export\s+ECS_TASK_MIN_CAPACITY=["|']?(\d+)["|']?/)[1]);

  /** @type {Array<Result>} */
  const results = [];
  const problems = [];
  let allowed = false;
  
  if (ecsTaskMaxCapacity >= ecsTaskMinCapacity) {
    allowed = true;
  }

  if (!allowed) {

    if (hasMax && !hasMin) {
      // Below is the message when developer has set the override value of ECS_TASK_MAX_CAPACITY, the value is less than the default value of ECS_TASK_MIN_CAPACITY.
      problems.push(
        `The value of **ECS_TASK_MAX_CAPACITY** is less than the default value of **ECS_TASK_MIN_CAPACITY**, click [here](https://blog.glgresearch.com/know/glg-deployment-system-gds/cluster-configuration/#env-ecs_task_min_capacity) to find the default value.`
      );
    }

    if (hasMin && !hasMax) {
      // Below is the message when developer has set the override value of ECS_TASK_MIN_CAPACITY, the value is greater than the default value of ECS_TASK_MAX_CAPACITY.
      problems.push(
        `The value of **ECS_TASK_MIN_CAPACITY** is greater than the default value of **ECS_TASK_MAX_CAPACITY**, click [here](https://blog.glgresearch.com/know/glg-deployment-system-gds/cluster-configuration/#env-ecs_task_max_capacity) to find the default value.`
      );
    }

    if (hasMax && hasMin) {
      // Below message should be poped when developer has set the override value to both ECS_TASK_MAX_CAPACITY and ECS_TASK_MIN_CAPACITY.
      problems.push(
        `Value of **ECS_TASK_MAX_CAPACITY** cannot be less than **ECS_TASK_MIN_CAPACITY**.`
      );
    }
  };

  if (problems.length > 0) {
    const exportRegex = !hasMax ? /export ECS_TASK_MIN_CAPACITY=/ : /export ECS_TASK_MAX_CAPACITY=/;
    const line = getLineNumber(deployment.ordersContents, exportRegex);
    results.push({
      title: checkMsg,
      line,
      level: "failure",
      path: deployment.ordersPath,
      problems,
    });
  }

  return results;
}

module.exports = validateCapacity;
