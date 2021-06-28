const { expect } = require("chai");
const jobsOnlyOnJObs = require("../checks/jobs-only-on-jobs");

describe("Jobs only on jobs clusters", () => {
  it("rejects jobs on all non-jobs clusters");

  it("rejects services on jobs clusters");

  it("accepts services on service clusters");

  it("accepts jobs on jobs clusters");
});
