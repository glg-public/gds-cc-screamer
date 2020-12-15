const { expect } = require("chai");
const noSourcing = require("../checks/no-sourcing");

describe("No Sourcing Check", () => {
  it("allows orders with no external sourcing", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: [],
    };

    const results = await noSourcing(orders);
    expect(results.length).to.equal(0);
  });

  it("rejects orders that source another file", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: ["source /var/starphleet/headquarters/cookie-beta/orders"],
    };

    const results = await noSourcing(orders);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].problems[0]).to.equal(
      "You should not source any other files in your orders files."
    );
  });
});
