const { expect } = require("chai");
const healthcheckCheck = require("../checks/healthcheck");

describe("Healthcheck Check", () => {
  it("works with a valid healthcheck", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: ["export HEALTHCHECK=/diagnostic"],
    };

    const results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(0);
  });

  it("Requires the presence of a healthcheck", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: ["export NOT_A_HEALTHCHECK=nothing"],
    };

    const results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `**${orders.path}** - You must set a healthcheck, and it cannot be at \`/\``
    );
  });

  it("rejects healthchecks at /", async () => {
    // works with a bare /
    let orders = {
      path: "streamliner/orders",
      contents: ["export HEALTHCHECK=/"],
    };

    let results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**/** - Your healthcheck cannot be at root."
    );

    // works with '/'
    orders = {
      path: "streamliner/orders",
      contents: ["export HEALTHCHECK='/'"],
    };

    results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**'/'** - Your healthcheck cannot be at root."
    );

    // works with "/"
    orders = {
      path: "streamliner/orders",
      contents: ['export HEALTHCHECK="/"'],
    };

    results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      '**"/"** - Your healthcheck cannot be at root.'
    );
  });

  it("rejects an empty healthcheck", async () => {
    // works with unset variable
    let orders = {
      path: "streamliner/orders",
      contents: ["export HEALTHCHECK="],
    };

    let results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "You must set a healthcheck, and it cannot be at `/`"
    );

    // works with ""
    orders = {
      path: "streamliner/orders",
      contents: ['export HEALTHCHECK=""'],
    };

    results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "You must set a healthcheck, and it cannot be at `/`"
    );

    // works with ''
    orders = {
      path: "streamliner/orders",
      contents: ["export HEALTHCHECK=''"],
    };

    results = await healthcheckCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "You must set a healthcheck, and it cannot be at `/`"
    );
  });
});
