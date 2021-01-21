const { expect } = require('chai');
const noOutOfScopeVars = require('../checks/no-out-of-scope-vars');

describe("No Out Of Scope Variables", () => {
  it("accepts orders with no undefined variable use.", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=hello",
        'MORE="You had me at $SOMETHING"',
        'echo "${MORE}"'
      ]
    }

    const results = await noOutOfScopeVars(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects orders that reference undefined variables.", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=hello",
        'MORE="You had me at $SOMETHING"',
        'echo "${MORE}"',
        "export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER | $JWT_ROLE_GLG_CLIENT))"
      ]
    }

    const results = await noOutOfScopeVars(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Out of Scope Variable Reference",
      line: 4,
      level: "failure",
      path: deployment.ordersPath,
      problems: [
        "GDS requires that all referenced variables be defined within the `orders` file. `.starphleet` has been deprecated.",
        "**Undefined Variable:** `JWT_ROLE_GLG_USER`",
        "**Undefined Variable:** `JWT_ROLE_GLG_CLIENT`",
      ]
    })
  });
})