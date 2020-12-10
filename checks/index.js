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
  require("./secrets-json-valid"),
  require("./secrets-in-orders"),
  require("./policy-json-valid"), //We should always validate the policy after anything that deals with secrets
];
