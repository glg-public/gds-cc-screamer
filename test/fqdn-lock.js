const { expect } = require("chai");
const { fqdnLock } = require("../checks");

describe("FQDN Lock", () => {
  it("skips if no fqdn_locks are configured", async () => {
    const deployment = {
      serviceName: "something",
      ordersContents: ["export GDS_FQDN='some.domain.com'"],
      ordersPath: "something/orders",
    };

    const inputs = {
      fqdnLocks: new Set(),
    };

    const results = await fqdnLock(deployment, {}, inputs);
    expect(results.length).to.equal(0);
  });

  it("skips if a deployment does not have an orders file", async () => {
    const deployment = {
      serviceName: "something",
    };

    const inputs = {
      fqdnLocks: new Set(["some.domain.com"]),
    };

    const results = await fqdnLock(deployment, {}, inputs);
    expect(results.length).to.equal(0);
  });

  it("blocks deployments to specified fqdns", async () => {
    const deployment = {
      serviceName: "something",
      ordersContents: ["export GDS_FQDN='some.domain.com'"],
      ordersPath: "something/orders",
    };
    const inputs = {
      fqdnLocks: new Set(["some.domain.com"]),
    };

    const results = await fqdnLock(deployment, {}, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });
});
