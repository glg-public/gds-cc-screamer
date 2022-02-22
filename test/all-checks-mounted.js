const { expect } = require("chai");
const fs = require("fs").promises;
const path = require("path");

const checks = require("../checks");

const exclusions = ["index.js", "template.js"];

describe("All Checks Are Mounted", () => {
  it("asserts all checks in the check directory have been mounted in checks/index.js", async () => {
    const allChecks = await fs.readdir(path.join(process.cwd(), "checks"));
    exclusions.forEach((filename) => {
      const index = allChecks.indexOf(filename);
      if (index > -1) {
        allChecks.splice(index, 1);
      }
    });

    const mountedChecks = Object.keys(checks);

    expect(mountedChecks.length).to.deep.equal(allChecks.length);
  });
});
