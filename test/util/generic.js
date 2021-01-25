const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const { isAJob, getContents } = require("../../util/generic");

describe("isAJob", () => {
  it("takes file lines, and determines if it is a job deployment", () => {
    let filelines = ["dockerdeploy github/glg/echo/gds:latest"];
    expect(isAJob(filelines)).to.be.false;

    filelines.push("unpublished");
    expect(isAJob(filelines)).to.be.true;

    filelines = ["jobdeploy github/glg/echo/gds:latest"];
    expect(isAJob(filelines)).to.be.true;
  });
});

describe("getContents", () => {
  it("loads all important files from a directory, and returns a deployment object", async () => {
    // Tests run from repo root, so have to specify the path
    const serviceName = path.join("test", "test-service");
    const deployment = await getContents(serviceName, [
      "orders",
      "secrets.json",
      "policy.json",
    ]);
    const ordersPath = path.join(serviceName, "orders");
    const ordersContents = fs.readFileSync(ordersPath, "utf8").split("\n");

    const secretsJsonPath = path.join(serviceName, "secrets.json");
    const secretsJsonContents = fs
      .readFileSync(secretsJsonPath, "utf8")
      .split("\n");

    const policyJsonPath = path.join(serviceName, "policy.json");
    const policyJsonContents = fs
      .readFileSync(policyJsonPath, "utf8")
      .split("\n");

    expect(deployment).to.deep.equal({
      serviceName,
      ordersPath,
      ordersContents,
      secretsJsonPath,
      secretsJsonContents,
      policyJsonPath,
      policyJsonContents,
    });
  });
});
