const { expect } = require("chai");
const noSourcing = require("../checks/no-sourcing");

describe("No Sourcing Check", () => {
  it("allows orders with no external sourcing", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
    };

    const results = await noSourcing(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects orders that source another file", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["source /var/starphleet/headquarters/cookie-beta/orders"],
    };

    const results = await noSourcing(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].problems[0]).to.equal(
      "You should not source any other files in your orders files."
    );
  });
});
