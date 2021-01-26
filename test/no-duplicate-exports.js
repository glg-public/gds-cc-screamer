const { expect } = require("chai");
const noDupes = require("../checks/no-duplicate-exports");

describe("No Duplicate Exports Check", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await noDupes(deployment);
    expect(results.length).to.equal(0);
  });

  it("allows orders with no duplicate exports", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export THREE=something",
        "export UNIQUE=123",
        'export VARS="quoted string"',
        "dockerdeploy github/glg/streamliner/main:latest"
      ],
    };

    const results = await noDupes(deployment);

    expect(results.length).to.equal(0);
  });

  it("rejects orders that contain duplicate exports", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export DUPED=something",
        "export DUPED=123",
        'export UNIQUE="quoted string"',
      ],
    };

    const results = await noDupes(deployment);

    expect(results.length).to.equal(2);

    expect(results[0].problems[0]).to.equal(
      "The variable `DUPED` is exported on multiple lines: **1, 2**"
    );

    expect(results[1].problems[0]).to.equal(
      "The variable `DUPED` is exported on multiple lines: **1, 2**"
    );
  });
});
