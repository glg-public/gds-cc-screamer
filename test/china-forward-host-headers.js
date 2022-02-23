const { expect } = require("chai");
const { chinaForwardHostHeaders } = require("../checks");

describe("GDS China - Forward Host Headers Must Use ICP Domains", () => {
  it("skips if it is not a gds china clusterconfig", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export FORWARD_HOST_HEADERS='some.domain.com'"],
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.s99", // Not a china config
            },
          },
        },
      },
    };

    const inputs = {
      icpDomains: ["glginc.cn"],
    };

    const results = await chinaForwardHostHeaders(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("skips if there are no orders", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      // No orders contents
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.china.clusterconfig.s99", // is a china config
            },
          },
        },
      },
    };

    const inputs = {
      icpDomains: ["glginc.cn"],
    };

    const results = await chinaForwardHostHeaders(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("skips if it is a jobs cluster", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export FORWARD_HOST_HEADERS='some.domain.com'"],
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.j99", // a jobs cluster
            },
          },
        },
      },
    };

    const inputs = {
      icpDomains: ["glginc.cn"],
    };

    const results = await chinaForwardHostHeaders(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("skips if the orders are for a job", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: [
        "export FORWARD_HOST_HEADERS='some.domain.com'",
        "jobdeploy github/owner/repo/branch:tag",
      ],
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.clusterconfig.s99", // Not a china config
            },
          },
        },
      },
    };

    const inputs = {
      icpDomains: ["glginc.cn"],
    };

    const results = await chinaForwardHostHeaders(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("skips if no FORWARD_HOST_HEADERS are defined", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: [],
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.china.clusterconfig.s99",
            },
          },
        },
      },
    };

    const inputs = {
      icpDomains: ["glginc.cn"],
    };

    const results = await chinaForwardHostHeaders(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("accepts orders that only use approved domains", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export FORWARD_HOST_HEADERS='some.glginc.cn'"],
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.china.clusterconfig.s99",
            },
          },
        },
      },
    };

    const inputs = {
      icpDomains: ["glginc.cn"],
    };

    const results = await chinaForwardHostHeaders(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("rejects orders that do not use an icp approved domain", async () => {
    const deployment = {
      serviceName: "something",
      ordersPath: "something/orders",
      ordersContents: ["export FORWARD_HOST_HEADERS='some.domain.com'"],
    };

    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: "gds.china.clusterconfig.s99",
            },
          },
        },
      },
    };

    const inputs = {
      icpDomains: ["glginc.cn"],
    };

    const results = await chinaForwardHostHeaders(deployment, context, inputs);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
  });
});
