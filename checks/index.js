/**
 * Exports an array of async functions
 */
module.exports = [
  require("./service-name"),
  require("./deployment-line"),
  require("./healthcheck"),
  require("./valid-bash-substitution"),
  require("./https-only"),
  require("./no-duplicate-exports"),
  require("./security-mode"),
  require("./no-sourcing"),
  require("./jwt-access-flags"),
  require("./no-spaces-in-exports"),
  require("./no-debug-in-prod"),
  require("./secrets-json-valid"),
  require("./secrets-in-orders"),
  require("./no-carriage-return"),
  require('./no-aws-secrets'),

  /**
   *  This should probably always be last, because it verifies that the
   *  policy includes permissions that are implied by orders and secrets.json
   * */ 
  require("./policy-json-valid"),
];
