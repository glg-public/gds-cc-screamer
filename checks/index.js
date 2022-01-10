const serviceName = require("./service-name");
const deploymentLine = require("./deployment-line");
const healthcheck = require("./healthcheck");
const validBashSubsitution = require("./valid-bash-substitution");
const httpsOnly = require("./https-only");
const noDuplicateExports = require("./no-duplicate-exports");
const securityMode = require("./security-mode");
const noSourcing = require("./no-sourcing");
const accessFlags = require("./jwt-access-flags");
const noSpacesInExports = require("./no-spaces-in-exports");
const noDebugInProd = require("./no-debug-in-prod");
const secretsJsonValid = require("./secrets-json-valid");
const secretsInOrders = require("./secrets-in-orders");
const noForbiddenCharacters = require("./no-forbidden-characters");
const noAWSSecrets = require("./no-aws-secrets");
const noOutOfScopeVars = require("./no-out-of-scope-vars");
const useCNAME = require("./use-cname");
const policyJsonValid = require("./policy-json-valid");
const noReservedVars = require("./no-reserved-vars");
const maxServicesPerCluster = require("./max-services-per-cluster");
const fqdnRequired = require("./fqdn-required");
const validTemplatesJson = require("./valid-templates-json");
const potentialSecrets = require("./potential-secrets");
const secretsExist = require("./secrets-exist");
const validateCron = require("./validate-cron");
const ecsScheduledTaskCount = require("./ecs-scheduled-task-count");
const jobsOnlyOnJobs = require("./jobs-only-on-jobs");
const restrictedBuckets = require("./restricted-buckets");
const doubleQuotes = require("./double-quotes");
const validBetas = require("./valid-betas");
const shellcheck = require("./shellcheck");
const validJsonArraysInBashCheck = require("./valid-json-arrays-in-bash")
const entrypointRequiresCmdCheck = require("./entrypoint-requires-cmd");

/**
 * Exports all checks in an appropriate order
 */
module.exports = {
  serviceName,
  deploymentLine,
  healthcheck,
  validBashSubsitution,
  httpsOnly,
  noDuplicateExports,
  securityMode,
  noSourcing,
  accessFlags,
  noSpacesInExports,
  noDebugInProd,
  secretsJsonValid,
  secretsInOrders,
  noForbiddenCharacters,
  noAWSSecrets,
  noOutOfScopeVars,
  useCNAME,
  noReservedVars,
  maxServicesPerCluster,
  validateCron,
  fqdnRequired,
  validTemplatesJson,
  potentialSecrets,
  secretsExist,
  ecsScheduledTaskCount,
  jobsOnlyOnJobs,
  doubleQuotes,
  validBetas,
  shellcheck,
  validJsonArraysInBashCheck,
  entrypointRequiresCmdCheck,

  /**
   *  This should always be after checks for orders and secrets.json, because it verifies that the
   *  policy includes permissions that are implied by orders and secrets.json
   * */
  policyJsonValid,

  /**
   * These checks should be after policyJsonValid, because they depend on a valid policy.json
   */
  restrictedBuckets,
};
