const { expect } = require("chai");
const ecsScheduledTaskCount = require("../checks/ecs-scheduled-task-count");

describe("Max ECS Task Count", () => {
  it("skips if there are no orders", async () => {
    const deployment = {
      serviceName: "service",
    };

    const results = await ecsScheduledTaskCount(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts orders without `ECS_SCHEDULED_TASK_COUNT`", async () => {
    const deployment = {
      serviceName: "service",
      ordersContents: ["export SOMETHING=pants"],
      ordersPath: "service/orders",
    };

    const results = await ecsScheduledTaskCount(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts orders with a valid value of `ECS_SCHEDULED_TASK_COUNT`", async () => {
    const deployment = {
      serviceName: "service",
      ordersContents: ["export ECS_SCHEDULED_TASK_COUNT=30"],
      ordersPath: "service/orders",
    };

    const results = await ecsScheduledTaskCount(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects orders with a task count that is too high", async () => {
    const deployment = {
      serviceName: "service",
      ordersContents: ["export ECS_SCHEDULED_TASK_COUNT=80"],
      ordersPath: "service/orders",
    };

    const results = await ecsScheduledTaskCount(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });

  it("rejects orders with a task count that is too low", async () => {
    const deployment = {
      serviceName: "service",
      ordersContents: ["export ECS_SCHEDULED_TASK_COUNT=-40"],
      ordersPath: "service/orders",
    };

    const results = await ecsScheduledTaskCount(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });

  it("rejects orders with a task count that not a number", async () => {
    const deployment = {
      serviceName: "service",
      ordersContents: ["export ECS_SCHEDULED_TASK_COUNT=pants"],
      ordersPath: "service/orders",
    };

    const results = await ecsScheduledTaskCount(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });
});
