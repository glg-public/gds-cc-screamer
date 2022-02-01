const { expect } = require("chai");

const jobsShouldUseBulkMail = require("../checks/jobs-should-use-bulkmail");

describe("jobsShouldUseBulkMail", () => {
  it("skips if there are no orders", async () => {
    const deployment = {
      serviceName: "fake",
    };

    const results = await jobsShouldUseBulkMail(deployment);
    expect(results.length).to.equal(0);
  });

  it("skips if deployment is not a job", async () => {
    const deployment = {
      serviceName: "fake",
      ordersContents: ["dockerdeploy github/glg/echo/gds:latest"],
    };

    const results = await jobsShouldUseBulkMail(deployment);
    expect(results.length).to.equal(0);
  });

  it("suggests replacing email-internal with bulkmail-internal", async () => {
    const deployment = {
      serviceName: "fake",
      ordersContents: [
        "jobdeploy github/glg/echo/gds:latest",
        'export SMTP_SERVER="email-internal.glgresearch.com"',
      ],
    };

    const results = await jobsShouldUseBulkMail(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].line).to.equal(2);
    expect(results[0].level).to.equal("failure");
    expect(results[0].problems[0]).to.match(
      /```suggestion\s+.+bulkmail-internal\.glgresearch\.com.*\s+```/
    );
  });
});
