const { expect } = require("chai");
const { validateCapcity } = require("../checks");

describe("Validate Capacity numbers", () => {
  it("Skips if it goes with default.", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export ANYOTHER='VALUE'"],
    };

    const results = await validateCapcity(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects when custom value of ECS_TASK_MAX_CAPACITY is less than default value of ECS_TASK_MIN_CAPACITY", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export ECS_TASK_MAX_CAPACITY=1"],
    };

    const results = await validateCapcity(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });

  it("rejects when custom value of ECS_TASK_MIN_CAPACITY is greater equal default value of ECS_TASK_MAX_CAPACITY", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export ECS_TASK_MIN_CAPACITY=6"],
    };

    const results = await validateCapcity(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });

  it("rejects when custom value of ECS_TASK_MAX_CAPACITY less than custom value of ECS_TASK_MAX_CAPACITY", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export ECS_TASK_MAX_CAPACITY=3", "export ECS_TASK_MIN_CAPACITY=6"],
    };

    const results = await validateCapcity(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });
});
