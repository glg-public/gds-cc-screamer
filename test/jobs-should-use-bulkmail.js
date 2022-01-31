const { expect } = require("chai");

const jobsShouldUseBulkMail = require("../checks/jobs-should-use-bulkmail");

describe("jobsShouldUseBulkMail", () => {
  it("skips if there are no orders");

  it("skips if deployment is not a job");

  it("suggests replacing email-internal with bulkmail-internal");
});
