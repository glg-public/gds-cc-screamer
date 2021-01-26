const { expect } = require("chai");
const healthcheckCheck = require("../checks/healthcheck");

describe("Healthcheck Check", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await healthcheckCheck(deployment);
    expect(results.length).to.equal(0);
  });

  it("skips if the deployment is a job", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["jobdeploy github/glg/streamliner/main:latest"],
    };

    const results = await healthcheckCheck(deployment);

    expect(results.length).to.equal(0);
  });

  it("works with a valid healthcheck", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export HEALTHCHECK=/diagnostic"],
    };

    const results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(0);
  });

  it("Requires the presence of a healthcheck", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export NOT_A_HEALTHCHECK=nothing"],
    };

    const results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `**${deployment.ordersPath}** - You must set a healthcheck, and it cannot be at \`/\``
    );
  });

  it("rejects healthchecks at /", async () => {
    // works with a bare /
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export HEALTHCHECK=/"],
    };

    let results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**/** - Your healthcheck cannot be at root."
    );

    // works with '/'
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export HEALTHCHECK='/'"],
    };

    results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**'/'** - Your healthcheck cannot be at root."
    );

    // works with "/"
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ['export HEALTHCHECK="/"'],
    };

    results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      '**"/"** - Your healthcheck cannot be at root.'
    );
  });

  it("rejects an empty healthcheck", async () => {
    // works with unset variable
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export HEALTHCHECK="],
    };

    let results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "You must set a healthcheck, and it cannot be at `/`"
    );

    // works with ""
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ['export HEALTHCHECK=""'],
    };

    results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "You must set a healthcheck, and it cannot be at `/`"
    );

    // works with ''
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export HEALTHCHECK=''"],
    };

    results = await healthcheckCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "You must set a healthcheck, and it cannot be at `/`"
    );
  });
});
