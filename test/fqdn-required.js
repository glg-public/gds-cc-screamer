const { expect } = require("chai");
const fs = require("fs").promises;
const fqdnRequired = require("../checks/fqdn-required");

// This makes unit testing much simpler
async function localGet(path) {
  const content = await fs.readFile(path, "utf8");
  return { data: JSON.parse(content) };
}

const inputs = {
  clusterMap: "test/fixtures/cluster-map.json",
};

describe("FQDN is Required", () => {
  it("accepts orders with a fqdn that is associated with the cluster #1", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export GDS_FQDN='streamliner.glgresearch.com'"],
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

    const results = await fqdnRequired(deployment, context, inputs, localGet);

    expect(results.length).to.equal(0);
  });

  it("accepts orders with a fqdn that is associated with the cluster #2", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ['export GDS_FQDN="streamliner.glgresearch.com"'],
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

    const results = await fqdnRequired(deployment, context, inputs, localGet);

    expect(results.length).to.equal(0);
  });

  it("skips if there are no orders present", async () => {
    const deployment = {
      serviceName: "streamliner",
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

    const results = await fqdnRequired(deployment, context, inputs, localGet);

    expect(results.length).to.equal(0);
  });

  it("skips if the deployment is a job", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["unpublished"],
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

    const results = await fqdnRequired(deployment, context, inputs, localGet);

    expect(results.length).to.equal(0);
  });

  it("warns if domain name is specified, but none are listed for the cluster", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export GDS_FQDN='streamliner.glgresearch.com'"],
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.s98",
            },
          },
        },
      },
    };

    const results = await fqdnRequired(deployment, context, inputs, localGet);

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
  });

  it("fails if a domain name is not defined", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export HEALTHCHECK='/healthcheck'"],
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

    const results = await fqdnRequired(deployment, context, inputs, localGet);

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].line).to.equal(1); // proposes adding after the rest of the environment
  });

  it("fails if a domain name is defined that is not associated with the cluster", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export GDS_FQDN='wrong.glgresearch.com'"],
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

    const results = await fqdnRequired(deployment, context, inputs, localGet);

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].line).to.equal(1); // proposes replacing the offending line
  });
});
