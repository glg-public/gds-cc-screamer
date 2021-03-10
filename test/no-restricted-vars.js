const { expect } = require("chai");
const noReservedVars = require("../checks/no-reserved-vars");

describe("No Reserved Variabes", () => {
  it("accepts orders with no reserved variables", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=allowed",
        'export SOMETHING_ELSE="also allowed"',
      ],
    };

    const results = await noReservedVars(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects orders that contain reserved variables", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=allowed",
        'export JWT_SECRET="this should get flagged"',
      ],
    };

    const results = await noReservedVars(deployment);
    expect(results.length).to.equal(1);

    expect(results[0]).to.deep.equal({
      title: "No Reserved Variables",
      path: deployment.ordersPath,
      level: "failure",
      line: 2,
      problems: [
        "`JWT_SECRET` is a reserved variable name in GDS. You will need to rename this variable.",
      ],
    });
  });
});
