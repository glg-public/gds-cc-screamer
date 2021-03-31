const { expect } = require("chai");
const validateCron = require("../checks/validate-cron");
const fs = require("fs").promises;
const path = require("path");
const { suggest } = require("../util");

const fixturesDir = path.join(process.cwd(), "test", "fixtures");

describe("Validate Cron", () => {
  it("skips if there are no orders", async () => {
    const deployment = {
      serviceName: "somejob",
    };

    const results = await validateCron(deployment);
    expect(results.length).to.equal(0);
  });

  it("skips if there is no cron statement", async () => {
    const orders = await fs.readFile(
      path.join(fixturesDir, "cc1", "test-service", "orders"),
      "utf8"
    );
    const deployment = {
      serviceName: "somejob",
      ordersContents: orders.split("\n"),
      ordersPath: "somejob/orders",
    };

    const results = await validateCron(deployment);
    expect(results.length).to.equal(0);
  });

  it("suggests an accurate comment above a cron statement if it is missing", async () => {
    const orders = await fs.readFile(
      path.join(fixturesDir, "cron-orders-no-comment"),
      "utf8"
    );
    const deployment = {
      serviceName: "somejob",
      ordersContents: orders.split("\n"),
      ordersPath: "somejob/orders",
    };

    const results = await validateCron(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Add A Comment",
      level: "notice",
      path: "somejob/orders",
      line: 7,
      problems: [suggest("Consider Adding A Comment", "\n# At 07:00 PM (UTC)")],
    });
  });

  it("rejects invalid cron statements", async () => {
    const orders = await fs.readFile(
      path.join(fixturesDir, "cron-orders-invalid"),
      "utf8"
    );
    const deployment = {
      serviceName: "somejob",
      ordersContents: orders.split("\n"),
      ordersPath: "somejob/orders",
    };

    const results = await validateCron(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Cron Statement",
      level: "failure",
      path: "somejob/orders",
      line: 8,
      problems: ["Error: hours part must be >= 0 and <= 23"],
    });
  });
});
