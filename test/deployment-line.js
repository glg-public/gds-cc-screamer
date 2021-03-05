const { expect } = require("chai");
const deploymentLineCheck = require("../checks/deployment-line");

describe("Deployment Line Check", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };
    const isChinaCC = false;

    const results = await deploymentLineCheck(deployment, isChinaCC);
    expect(results.length).to.equal(0);
  });

  it("works with a valid deployment line", async () => {
    // works with autodeploy
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github.com:glg/price-service.git#main"],
    };

    let isChinaCC = false;

    let results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(0);

    // works with dockerbuild
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerbuild git@github.com:glg/price-service.git#main"],
    };

    isChinaCC = true;

    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(0);

    // works with dockerdeploy in global
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/price-service/main:latest"],
    };

    isChinaCC = false; // here we go with global

    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(0);

    // works with dockerdeploy in china
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/price-service/main:latest"],
    };

    isChinaCC = true; // here we go with china

    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(0);

    // works with jobdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["jobdeploy github/glg/price-service/main:latest"],
    };

    isChinaCC = false;

    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(0);
  });

  it("Global: rejects an improperly formatted dockerdeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy git@github:glg/streamliner.git:latest"],
    };

    isChinaCC = false;

    const results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `dockerdeploy github/<org>/<repo>/<branch>:<tag>`"
    );
  });

  it("Global: rejects an improperly formatted jobdeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["jobdeploy git@github:glg/streamliner.git:latest"],
    };

    isChinaCC = false;

    const results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `jobdeploy github/<org>/<repo>/<branch>:<tag>`"
    );
  });

  it("Global: rejects an improperly formatted autodeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github/glg/streamliner.git#main"],
    };

    isChinaCC = false;

    const results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `autodeploy git@github.com:<org>/<repo>[.git]#<branch>`"
    );
  });

  it("China: rejects an improperly formatted dockerbuild line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerbuild git@github/glg/streamliner.git#main"],
    };

    isChinaCC = true;

    const results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `dockerbuild git@github.com:<org>/<repo>[.git]#<branch>`"
    );
  });

  it("Global: requires either a dockerdeploy or an autodeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ['export HEALTHCHECK="/diagnostic"'],
    };

    isChinaCC = false;

    const results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `**${deployment.ordersPath}** - Missing deployment. Must include either an \`autodeploy\` line, a \`dockerdeploy\` line, or a \`jobdeploy\` line.`
    );
  });

  it("China: requires either a dockerdeploy or an dockbuild line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ['export HEALTHCHECK="/diagnostic"'],
    };

    isChinaCC = true;

    const results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `**${deployment.ordersPath}** - Missing deployment. Must include either an \`dockerbuild\` line, or a \`dockerdeploy\` line.`
    );
  });

  it("rejects repository names with invalid characters", async () => {
    // works with autodeploy
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github.com:glg/PriceService.git#main"],
    };

    let isChinaCC = false;

    let results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**PriceService** - Repository name must be only lowercase alphanumeric characters and hyphens."
    );

    // works with dockerbuild
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerbuild git@github.com:glg/PriceService.git#main"],
    };

    isChinaCC = true;

    results = await deploymentLineCheck(deployment, isChinaCC);

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

    isChinaCC = false;

    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**PriceService** - Repository name must be only lowercase alphanumeric characters and hyphens."
    );

    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/PriceService/main:latest"],
    };

    isChinaCC = true;

    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**PriceService** - Repository name must be only lowercase alphanumeric characters and hyphens."
    );
  });

  it("rejects branch names with invalid characters", async () => {
    // works with autodeploy
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "autodeploy git@github.com:glg/price-service.git#Wrong_Branch!",
      ],
    };

    let isChinaCC = false;

    let results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens."
    );

    // works with dockerbuild
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerbuild git@github.com:glg/price-service.git#Wrong_Branch!",
      ],
    };

    isChinaCC = true;
    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens."
    );

    // works with dockerdeploy in global
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerdeploy github/glg/price-service/Wrong_Branch!:latest",
      ],
    };

    isChinaCC = false;
    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens."
    );

    // works with dockerdeploy in china
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerdeploy github/glg/price-service/Wrong_Branch!:latest",
      ],
    };

    isChinaCC = true;
    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens."
    );
  });

  it("rejects branch names that contain --", async () => {
    // works with autodeploy
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "autodeploy git@github.com:glg/price-service.git#too--many",
      ],
    };

    let isChinaCC = false;

    let results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**too--many** - Branch name cannot contain `--`"
    );

    // works with dockerbuild
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "dockerbuild git@github.com:glg/price-service.git#too--many",
      ],
    };

    isChinaCC = true;

    results = await deploymentLineCheck(deployment, isChinaCC);

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

    isChinaCC = true;

    results = await deploymentLineCheck(deployment, isChinaCC);

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

    isChinaCC = false;

    results = await deploymentLineCheck(deployment, isChinaCC);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**too--many** - Branch name cannot contain `--`"
    );
  });
});
