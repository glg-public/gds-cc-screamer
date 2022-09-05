const { expect } = require("chai");
const { validateCapacity } = require("../checks");
const fs = require("fs").promises;
const path = require("path");
const fixturesDir = path.join(process.cwd(), "test", "fixtures");

describe("Validate Capacity numbers", () => {
  it("Skips if it goes with default.", async () => {
    const orders = await fs.readFile(
      path.join(fixturesDir, "capacity-default"),
      "utf8"
    );
    const deployment = {
      serviceName: "something",
      ordersContents: orders.split("\n"),
      ordersPath: "something/orders",
    };

    const results = await validateCapacity(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects when custom value of ECS_TASK_MAX_CAPACITY is less than default value of ECS_TASK_MIN_CAPACITY", async () => {
    const orders = await fs.readFile(
      path.join(fixturesDir, "capacity-custom-max"),
      "utf8"
    );
    const deployment = {
      serviceName: "something",
      ordersContents: orders.split("\n"),
      ordersPath: "something/orders",
    };

    const results = await validateCapacity(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].path).to.equal(deployment.ordersPath);
  });

  it("rejects when custom value of ECS_TASK_MIN_CAPACITY is greater equal default value of ECS_TASK_MAX_CAPACITY", async () => {
    const orders = await fs.readFile(
      path.join(fixturesDir, "capacity-custom-min"),
      "utf8"
    );
    const deployment = {
      serviceName: "something",
      ordersContents: orders.split("\n"),
      ordersPath: "something/orders",
    };

    const results = await validateCapacity(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].path).to.equal(deployment.ordersPath);
  });

  it("rejects when custom value of ECS_TASK_MAX_CAPACITY less than custom value of ECS_TASK_MAX_CAPACITY", async () => {
    const orders = await fs.readFile(
      path.join(fixturesDir, "capacity-custom-both"),
      "utf8"
    );
    const deployment = {
      serviceName: "something",
      ordersContents: orders.split("\n"),
      ordersPath: "something/orders",
    };

    const results = await validateCapacity(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].path).to.equal(deployment.ordersPath);
  });
});
