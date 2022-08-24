const { expect } = require("chai");
const { validateDeploymentLine: deploymentLineCheck, dockerdeploy, jobdeploy, autodeploy } = require("../checks/deployment-line");

describe("Deployment-line regex parsers", () => {
  it("parses dockerdeploy", () => {
    const line = "dockerdeploy github/glg/streamliner/main:latest";
    const match = dockerdeploy.exec(line);

    expect(match.groups).to.deep.equal({
      source: "github",
      org: "glg",
      repo: "streamliner",
      path: undefined,
      branch: "main",
      tag: "latest"
    })
  })

  it("parses dockerdeploy with dashes", () => {
    const line = "dockerdeploy github/glg/gds-base-images/main:job-node16-alpine";
    const match = dockerdeploy.exec(line);

    expect(match.groups).to.deep.equal({
      source: "github",
      org: "glg",
      repo: "gds-base-images",
      path: undefined,
      branch: "main",
      tag: "job-node16-alpine"
    })
  })


  it("parses dockerdeploy with paths", () => {
    const line = "dockerdeploy github/glg/sl2-mono/apps/sl-home/main:latest";
    const match = dockerdeploy.exec(line);

    expect(match.groups).to.deep.equal({
      source: "github",
      org: "glg",
      repo: "sl2-mono",
      path: "apps/sl-home",
      branch: "main",
      tag: "latest"
    })
  })

  it("parses jobdeploy", () => {
    const line = "jobdeploy github/glg/streamliner/main:latest";
    const match = jobdeploy.exec(line);

    expect(match.groups).to.deep.equal({
      source: "github",
      org: "glg",
      repo: "streamliner",
      path: undefined,
      branch: "main",
      tag: "latest"
    })
  })

  it("parses jobdeploy with dashes", () => {
    const line = "jobdeploy github/glg/gds-base-images/main:job-node16-alpine";
    const match = jobdeploy.exec(line);

    expect(match.groups).to.deep.equal({
      source: "github",
      org: "glg",
      repo: "gds-base-images",
      path: undefined,
      branch: "main",
      tag: "job-node16-alpine"
    })
  })


  it("parses jobdeploy with paths", () => {
    const line = "jobdeploy github/glg/sl2-mono/apps/sl-home/main:latest";
    const match = jobdeploy.exec(line);

    expect(match.groups).to.deep.equal({
      source: "github",
      org: "glg",
      repo: "sl2-mono",
      path: "apps/sl-home",
      branch: "main",
      tag: "latest"
    })
  })
})

describe("Deployment Line Check", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner",
    };

    const results = await deploymentLineCheck(deployment);
    expect(results.length).to.equal(0);
  });

  it("works with a valid deployment line", async () => {
    // works with autodeploy
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github.com:glg/price-service.git#main"],
    };

    let results = await deploymentLineCheck(deployment, {}, {});

    expect(results[0].problems.length).to.equal(0);

    // works with dockerdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/price-service/main:latest"],
    };

    results = await deploymentLineCheck(deployment, {}, {});

    expect(results[0].problems.length).to.equal(0);

    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/price-service/main:job-node16-alpine"],
    };

    results = await deploymentLineCheck(deployment, {}, {});

    expect(results[0].problems.length).to.equal(0);

    // works with jobdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["jobdeploy github/glg/price-service/main:latest"],
    };

    results = await deploymentLineCheck(deployment, {}, {});

    expect(results[0].problems.length).to.equal(0);

    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["jobdeploy github/glg/price-service/main:job-node16-alpine"],
    };

    results = await deploymentLineCheck(deployment, {}, {});

    expect(results[0].problems.length).to.equal(0);
  });

  it("works on dockerdeploy with nested ECR images", async () => {
    // works with dockerdeploy
    deployment = {
      serviceName: "sl-settings",
      ordersPath: "sl-settings/orders",
      ordersContents: ["dockerdeploy github/glg/sl2-mono/apps/settings/main:latest"],
    };

    results = await deploymentLineCheck(deployment, {}, {});

    expect(results[0].problems.length).to.equal(0);
  });

  it("works on jobdeploy with nested ECR images", async () => {
    // works with jobdeploy
    deployment = {
      serviceName: "sl-settings",
      ordersPath: "sl-settings/orders",
      ordersContents: ["jobdeploy github/glg/sl2-mono/apps/settings/main:latest"],
    };

    results = await deploymentLineCheck(deployment, {}, {});

    expect(results[0].problems.length).to.equal(0);
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
      "Incorrect Formatting: must be `dockerdeploy github/<org>/<repo>/<?path/><branch>:<tag>`"
    );
    expect(results[0].level).to.equal("failure");
  });

  it("rejects an improperly formatted jobdeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["jobdeploy git@github:glg/streamliner.git:latest"],
    };

    const results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `jobdeploy github/<org>/<repo>/<?path/><branch>:<tag>`"
    );
    expect(results[0].level).to.equal("failure");
  });

  it("rejects an improperly formatted autodeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github/glg/streamliner.git#main"],
    };

    const results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "Incorrect Formatting: must be `autodeploy git@github.com:<org>/<repo>[.git]#<branch>`"
    );
    expect(results[0].level).to.equal("failure");
  });

  it("requires either a dockerdeploy or an autodeploy line", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ['export HEALTHCHECK="/diagnostic"'],
    };

    const results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `**${deployment.ordersPath}** - Missing deployment. Must include either an \`autodeploy\` line, a \`dockerdeploy\` line, or a \`jobdeploy\` line.`
    );
    expect(results[0].level).to.equal("failure");
  });

  it("rejects repository names with invalid characters", async () => {
    // works with autodeploy
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github.com:glg/PriceService.git#main"],
    };

    let results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.match(
      /repository name must be only lowercase alphanumeric characters and hyphens/i
    );
    expect(results[0].level).to.equal("failure");

    // works with dockerdeploy
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/PriceService/main:latest"],
    };

    results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.match(
      /repository name must be only lowercase alphanumeric characters and hyphens/i
    );
    expect(results[0].level).to.equal("failure");
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

    let results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.match(
      /branch name must be only lowercase alphanumeric characters and hyphens/i
    );
    expect(results[0].level).to.equal("failure");

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
    expect(results[0].problems[0]).to.match(
      /branch name must be only lowercase alphanumeric characters and hyphens/i
    );
    expect(results[0].level).to.equal("failure");
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

    let results = await deploymentLineCheck(deployment);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      "**too--many** - Branch name cannot contain `--`"
    );

    // works with dockerdeploy
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
    expect(results[0].level).to.equal("failure");
  });

  it("rejects autodeploys with non-existant repos", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github.com:glg/notrealatall.git#main"],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "someurl",
    };

    const localGet = async (url, options) => {
      throw { error: "not found", statusCode: 404 };
    };

    let results = await deploymentLineCheck(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results[0].problems.length).to.equal(2);
    expect(/not.*?found/i.test(results[0].problems[0])).to.be.true;
    expect(results[0].level).to.equal("failure");
  });

  it("rejects autodeploys with non-existant branches", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["autodeploy git@github.com:glg/echo.git#fakebranch"],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "someurl",
    };

    const localGet = async (url, options) => {
      return { data: ["main", "another"] };
    };

    let results = await deploymentLineCheck(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results[0].problems.length).to.equal(2);
    expect(/branch/i.test(results[0].problems[0])).to.be.true;
    expect(results[0].level).to.equal("failure");
  });

  it("rejects dockerdeploys and jobdeploys with non-existant ecr repos", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/fakerepo/main:latest"],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "someurl",
    };

    const localGet = async (url, options) => {
      throw { error: "not found", statusCode: 404 };
    };

    let results = await deploymentLineCheck(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results[0].problems.length).to.equal(3);
    expect(/not.*?found/i.test(results[0].problems[0])).to.be.true;
    expect(results[0].level).to.equal("failure");
  });

  it("rejects dockerdeploys and jobdeploys with non-existant tags on ecr repos", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["dockerdeploy github/glg/realrepo/main:faketag"],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "someurl",
    };

    const localGet = async (url, options) => {
      return { data: ["latest", "asdlkfjsdlfkjdsalk"] };
    };

    let results = await deploymentLineCheck(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results[0].problems.length).to.equal(3);
    expect(/tag/i.test(results[0].problems[0])).to.be.true;
    expect(results[0].level).to.equal("failure");
  });
});
