const { expect } = require("chai");
const fs = require("fs").promises;
const path = require("path");
const shellcheck = require("../checks/shellcheck");

const fixturesDir = path.join(process.cwd(), "test", "fixtures");

describe("shellcheck", () => {
  it("works with a valid orders file", async () => {
    const ordersPath = path.join(fixturesDir, "public-orders");
    const orders = await fs.readFile(ordersPath, "utf-8");
    const deployment = {
      ordersContents: orders.split("\n"),
      ordersPath,
    };

    const results = await shellcheck(deployment);

    expect(results.length).to.equal(0);
  });

  it("checks an orders file for valid bash #1", async () => {
    const ordersPath = path.join(fixturesDir, "bad-orders1");
    const orders = await fs.readFile(ordersPath, "utf-8");
    const deployment = {
      ordersContents: orders.split("\n"),
      ordersPath,
    };

    const results = await shellcheck(deployment);

    expect(results.length).to.equal(2);
    expect(results[0].problems[0]).to.match(/single quoted string/i);
    expect(results[1].problems[0]).to.match(/end of single quoted string/i);
  });

  it("checks an orders file for valid bash #2", async () => {
    const ordersPath = path.join(fixturesDir, "bad-orders2");
    const orders = await fs.readFile(ordersPath, "utf-8");
    const deployment = {
      ordersContents: orders.split("\n"),
      ordersPath,
    };

    const results = await shellcheck(deployment);

    expect(results.length).to.equal(3);
    expect(results[0].problems[0]).to.match(/spaces around =/i);
    expect(results[1].problems[0]).to.match(/spaces around =/i);
    expect(results[2].problems[0]).to.match(/spaces around =/i);
  });

  it("checks an orders file for valid bash #3", async () => {
    const ordersPath = path.join(fixturesDir, "bad-orders3");
    const orders = await fs.readFile(ordersPath, "utf-8");
    const deployment = {
      ordersContents: orders.split("\n"),
      ordersPath,
    };

    const results = await shellcheck(deployment);

    expect(results.length).to.equal(3);
    expect(results[0].problems[0]).to.match(/here doc/i);
    expect(results[1].problems[0]).to.match(/linefeed/i);
    expect(results[2].problems[0]).to.match(/here doc.*terminated/i);
  });
});
