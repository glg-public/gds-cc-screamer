const { expect } = require("chai");
const deploymentLineCheck = require("../checks/deployment-line");

describe("Deployment Line Check", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await deploymentLineCheck(deployment);
    expect(results.length).to.equal(0);
  });

  it("works with a valid deployment line", async () => {
    // works with dockerbuild
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerbuild git@github.com:glg/price-service.git#main"],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(0);

    // works with dockerdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/price-service/main:latest"],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(0);
  });

  it("block global deployment line", async () => {
    // block autodeploy
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github.com:glg/price-service.git#main"],
    };

    let results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "GDS China supports `dockerbuild` and `dockerdeploy` only."
    );

    // block jobdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["jobdeploy github/glg/price-service/main:latest"],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "GDS China supports `dockerbuild` and `dockerdeploy` only."
    );

  });

  it("rejects an improperly formatted dockerdeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy git@github:glg/streamliner.git:latest"],
    };

    const results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `dockerdeploy github/<org>/<repo>/<branch>:<tag>`"
    );
  });

  it("rejects an improperly formatted dockerbuild line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerbuild git@github/glg/streamliner.git#main"],
    };

    const results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `dockerbuild git@github.com:<org>/<repo>[.git]#<branch>`"
    );
  });

  it("requires either a dockerdeploy or an dockbuild line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ['export HEALTHCHECK="/diagnostic"'],
    };

    const results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `**${deployment.ordersPath}** - Missing deployment. Must include either an \`dockerbuild\` line, or a \`dockerdeploy\` line.`
    );
  });

  it("rejects repository names with invalid characters", async () => {
    // works with dockerbuild
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerbuild git@github.com:glg/PriceService.git#main"],
    };

    let results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**PriceService** - Repository name must be only lowercase alphanumeric characters and hyphens."
    );

    // works with dockerdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/PriceService/main:latest"],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**PriceService** - Repository name must be only lowercase alphanumeric characters and hyphens."
    );
  });

  it("rejects branch names with invalid characters", async () => {
    // works with dockerbuild
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerbuild git@github.com:glg/price-service.git#Wrong_Branch!",
      ],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens."
    );

    // works with dockerdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerdeploy github/glg/price-service/Wrong_Branch!:latest",
      ],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens."
    );
  });

  it("rejects branch names that contain --", async () => {
    // works with dockerbuild
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerbuild git@github.com:glg/price-service.git#too--many",
      ],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**too--many** - Branch name cannot contain `--`"
    );

    // works with dockerdeploy in china
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerdeploy github/glg/price-service/too--many:latest",
      ],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**too--many** - Branch name cannot contain `--`"
    );

    // works with dockerdeploy in global
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerdeploy github/glg/price-service/too--many:latest",
      ],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**too--many** - Branch name cannot contain `--`"
    );
  });
});
