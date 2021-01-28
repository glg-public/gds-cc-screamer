const { expect } = require("chai");
const fs = require('fs').promises;
const useCNAME = require("../checks/use-cname");
const { suggest } = require("../util");

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

const inputs = {
  clusterMap: "test/fixtures/cluster-map.json"
};

async function localGet(path) {
  const content = await fs.readFile(path, 'utf8');
  return JSON.parse(content);
}

describe.only("Use CNAME instead of cluster dns", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await useCNAME(deployment, {}, inputs, localGet);
    expect(results.length).to.equal(0);
  });

  it("warns when it encounters a url that looks like a cluster dns", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export PUBLIC_URL=https://s99.glgresearch.com/streamliner",
      ],
    };

    const results = await useCNAME(deployment, context, inputs, localGet);
    expect(results.length).to.equal(1);

    const clusterMap = await localGet(inputs.clusterMap);

    let problem = "Rather than using the cluster dns (`s99.glgresearch.com`), consider using a friendly CNAME like one of the following:\n" + clusterMap.s99.hosts.map((host) => suggest("", deployment.ordersContents[0].replace("s99.glgresearch.com", host))).join('\n');

    expect(results[0]).to.deep.equal({
      title: "Use friendly CNAME instead",
      line: 1,
      level: "warning",
      path: deployment.ordersPath,
      problems: [
        problem
      ],
    });

    //"Rather than using the cluster dns (`s99.glgresearch.com`), consider using a friendly CNAME (e.g. `streamliner.glgresearch.com`)"
  });
});
