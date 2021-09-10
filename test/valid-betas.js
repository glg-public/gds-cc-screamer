const { expect } = require("chai");
const { validBetas } = require("../checks");

const path = require("path");

const fixturesDir = path.join(process.cwd(), "test", "fixtures");
const inputs = {
  clusterRoot: path.join(fixturesDir, "cc6"),
};

describe.only("validBetas", () => {
  it("accepts a valid PATH_OF_NON_BETA_VERSION", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: ["export PATH_OF_NON_BETA_VERSION=/something"],
    };
    const results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(0);
  });

  it("requires PATH_OF_NON_BETA_VERSION to start with a /", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: ["export PATH_OF_NON_BETA_VERSION=something"],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].title).to.match(/must start with/i);
  });

  it("requires PATH_OF_NON_BETA_VERSION to be a single path", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: [
        "export PATH_OF_NON_BETA_VERSION=/something,/something-else",
      ],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].title).to.match(/must be.*single/i);
  });

  it("requires PATH_OF_NON_BETA_VERSION to reference an existing deployment", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: ["export PATH_OF_NON_BETA_VERSION=/something-fake"],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].title).to.match(/must.*exist/i);
  });

  it("does not require PATH_OF_NON_BETA_VERSION to be defined", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: ["export PATHS_OF_OTHER_BETAS=/something"],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(0);
  });

  it("requires PATHS_OF_OTHER_BETAS to start with a /", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: ["export PATHS_OF_OTHER_BETAS=something,something-else"],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].title).to.match(/must start with/i);
  });

  it("requires PATHS_OF_OTHER_BETAS to be a comma-separated list of paths", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: [
        "export PATHS_OF_OTHER_BETAS=/something,/something-else",
      ],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(0);
  });

  it("requires PATHS_OF_OTHER_BETAS to reference existing deployments", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: [
        "export PATHS_OF_OTHER_BETAS=/something,/something-else,/something-fake",
      ],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].title).to.match(/must.*exist/i);
  });

  it("does not require PATHS_OF_OTHER_BETAS to be defined", async () => {
    const deployment = {
      serviceName: "service",
      ordersPath: "service/orders",
      ordersContents: ["export PATH_OF_NON_BETA_VERSION=/something"],
    };

    let results = await validBetas(deployment, null, inputs);
    expect(results.length).to.equal(0);
  });
});
