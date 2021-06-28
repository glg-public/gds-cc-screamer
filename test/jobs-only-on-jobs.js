const { expect } = require("chai");
const jobsOnlyOnJobs = require("../checks/jobs-only-on-jobs");

describe("Jobs only on jobs clusters", () => {
  it("rejects jobs on all non-jobs clusters", async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.s01",
            },
          },
        },
      },
    };

    const deployment = {
      serviceName: "example",
      ordersPath: "example/orders",
      ordersContents: ["jobdeploy github/org/repo/branch:tag"],
    };

    // Fails for secure clusters
    let results = await jobsOnlyOnJobs(deployment, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");

    // Fails for internal clusters
    context.payload.pull_request.base.repo.name = "gds.clusterconfig.i01";
    results = await jobsOnlyOnJobs(deployment, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");

    // Fails for public clusters
    context.payload.pull_request.base.repo.name = "gds.clusterconfig.p01";
    results = await jobsOnlyOnJobs(deployment, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });

  it("rejects services on jobs clusters", async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.j01",
            },
          },
        },
      },
    };

    const deployment = {
      serviceName: "example",
      ordersPath: "example/orders",
      ordersContents: ["dockerdeploy github/org/repo/branch:tag"],
    };

    const results = await jobsOnlyOnJobs(deployment, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });

  it("accepts services on service clusters", async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.s01",
            },
          },
        },
      },
    };

    const deployment = {
      serviceName: "example",
      ordersPath: "example/orders",
      ordersContents: ["dockerdeploy github/org/repo/branch:tag"],
    };

    const results = await jobsOnlyOnJobs(deployment, context);
    expect(results.length).to.equal(0);
  });

  it("accepts jobs on jobs clusters", async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.j01",
            },
          },
        },
      },
    };

    const deployment = {
      serviceName: "example",
      ordersPath: "example/orders",
      ordersContents: ["jobdeploy github/org/repo/branch:tag"],
    };

    const results = await jobsOnlyOnJobs(deployment, context);
    expect(results.length).to.equal(0);
  });
});
