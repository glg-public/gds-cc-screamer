const { expect } = require("chai");
const noDupeHostHeaders = require("../checks/no-duplicate-forward-host-headers");
const path = require("path");

describe("No Duplicate Host Header Check", () => {
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

  it("skips if jobs cluster", async () => {
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

    const results = await noDupeHostHeaders(deployment, context);
    expect(results.length).to.equal(0);
  });

  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await noDupeHostHeaders(deployment, context);
    expect(results.length).to.equal(0);
  });

  it("skips if forward host headers is not defined", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersContents: ["export TOM=pants"]
    };

    const results = await noDupeHostHeaders(deployment, context);
    expect(results.length).to.equal(0);
  });

  it("fails if a single duplicate host header value is detected in a cluster", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersContents: ['export FORWARD_HOST_HEADERS="single.glgroup.com'],
      ordersPath: "streamliner/orders"
    };

    const inputs = {
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc7"),
    };

    const results = await noDupeHostHeaders(deployment,context,inputs);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Duplicate host header value",
      problems: [
        "No more than one unique FORWARD HOST HEADER value can be set per cluster config. The following value(s) are not unique for this cluster:",
        "**single.glgroup.com** was found in the **test-service3** orders file."
      ],
      level: 'failure',
      line: 1,
      path: deployment.ordersPath
    })
  });

  it("fails if multiple duplicate host header values are detected in a cluster", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersContents: ['export FORWARD_HOST_HEADERS="examplething.glgroup.com,mikes-really-long-name.glgroup.com"'],
      ordersPath: "streamliner/orders"
    };

    const inputs = {
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc7"),
    };

    const results = await noDupeHostHeaders(deployment,context,inputs);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Duplicate host header value",
      problems: [
        "No more than one unique FORWARD HOST HEADER value can be set per cluster config. The following value(s) are not unique for this cluster:",
        "**examplething.glgroup.com** was found in the **test-service2** orders file.",
        "**mikes-really-long-name.glgroup.com** was found in the **test-service** orders file."
      ],
      level: 'failure',
      line: 1,
      path: deployment.ordersPath
    })
  });

  it("it passes if forward host header is unique", async () => {
    const deployment = {
      serviceName: "test-service4",
      ordersContents: ['export FORWARD_HOST_HEADERS="unique.glgroup.com"'],
      ordersPath: "test-service4/orders"
    };

    const inputs = {
      clusterRoot: path.join(process.cwd(), "test", "fixtures", "cc7"),
    };

    const results = await noDupeHostHeaders(deployment,context,inputs);
    expect(results.length).to.equal(0);
  });
});
