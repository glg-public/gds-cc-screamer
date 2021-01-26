const { expect } = require("chai");
const useCNAME = require("../checks/use-cname");

describe("Use CNAME instead of cluster dns", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await useCNAME(deployment);
    expect(results.length).to.equal(0);
  });

  it("warns when it encounters a url that looks like a cluster dns", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export PUBLIC_URL=https://s99.glgresearch.com/streamliner",
      ],
    };

    const results = await useCNAME(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Use friendly CNAME instead",
      line: 1,
      level: "warning",
      path: deployment.ordersPath,
      problems: [
        "Rather than using the cluster dns (`s99.glgresearch.com`), consider using the friendly CNAME (e.g. `streamliner.glgresearch.com`)",
      ],
    });
  });
});
