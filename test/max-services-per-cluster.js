const { expect } = require("chai");
const maxServicesPerCluster = require("../checks/max-services-per-cluster");
const path = require("path");

describe("Max Services Per Cluster", () => {
  const deployment = {
    serviceName: "streamliner",
    ordersContents: [],
  };

  const context = {
    payload: {
      pull_request: {
        base: {
          repo: {
            name: "gds.clusterconfig.s99",
          },
        },
      },
    },
  };

  it("accepts a deployment when there are few existing deployments", async () => {
    const inputs = {
      numServicesFailThreshold: 4,
      numServicesWarnThreshold: 2,
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc1"),
    };

    const results = await maxServicesPerCluster(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("warns when the number of deployments is approaching the limit", async () => {
    const inputs = {
      numServicesFailThreshold: 4,
      numServicesWarnThreshold: 2,
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc2"),
    };

    const results = await maxServicesPerCluster(deployment, context, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
  });

  it("rejects deployments that would cause there to be too many deployments in the cluster", async () => {
    const inputs = {
      numServicesFailThreshold: 4,
      numServicesWarnThreshold: 2,
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc5"),
    };

    const results = await maxServicesPerCluster(deployment, context, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });

  it("skips this check for jobs clusters", async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.j99",
            },
          },
        },
      },
    };

    const inputs = {
      numServicesFailThreshold: 4,
      numServicesWarnThreshold: 2,
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc5"),
    };

    const results = await maxServicesPerCluster(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("skips this check for unpublished", async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.i99",
            },
          },
        },
      },
    };

    const inputs = {
      numServicesFailThreshold: 4,
      numServicesWarnThreshold: 2,
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc5"),
    };

    const deployment = {
      serviceName: "streamliner",
      ordersContents: [
        "dockerdeploy github/glg/bottle-subscribers/main:latest",
        "unpublished",
      ],
    };

    const results = await maxServicesPerCluster(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });
});
