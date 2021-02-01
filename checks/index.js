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
const noCarriageReturn = require("./no-carriage-return");
const noAWSSecrets = require("./no-aws-secrets");
const noOutOfScopeVars = require("./no-out-of-scope-vars");
const useCNAME = require("./use-cname");
const policyJsonValid = require("./policy-json-valid");

/**
 * Exports an array of async functions
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
  noCarriageReturn,
  noAWSSecrets,
  noOutOfScopeVars,
  useCNAME,
  policyJsonValid,

  // Also export as an array for use by checksuite
  all: [
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
    noCarriageReturn,
    noAWSSecrets,
    noOutOfScopeVars,
    useCNAME,

    /**
     *  This should probably always be last, because it verifies that the
     *  policy includes permissions that are implied by orders and secrets.json
     * */
    policyJsonValid,
  ]
};
