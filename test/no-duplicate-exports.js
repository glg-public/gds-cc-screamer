const { expect } = require("chai");
const noDupes = require("../checks/no-duplicate-exports");

describe("No Duplicate Exports Check", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner",
    };

    const results = await noDupes(deployment);
    expect(results.length).to.equal(0);
  });

  it("allows orders with no duplicate exports", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export THREE=something",
        "export UNIQUE=123",
        'export VARS="quoted string"',
        "dockerdeploy github/glg/streamliner/main:latest",
      ],
    };

    const results = await noDupes(deployment);

    expect(results.length).to.equal(0);
  });

  it("warns for orders that contain duplicate exports", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export DUPED=something",
        "export DUPED=123",
        'export UNIQUE="quoted string"',
      ],
    };

    const results = await noDupes(deployment);

    expect(results.length).to.equal(2);

    expect(results[0].problems[0]).to.equal(
      "The variable `DUPED` is exported on multiple lines: **1, 2**"
    );
    expect(results[0].level).to.equal("warning");

    expect(results[1].problems[0]).to.equal(
      "The variable `DUPED` is exported on multiple lines: **1, 2**"
    );
    expect(results[1].level).to.equal("warning");
  });

  it("blocks deployments when secrets.json declares a variable already declared in orders", async () => {
    const secretsJson = [
      {
        name: "JSON_SECRET",
        valueFrom:
          "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::",
      },
      {
        name: "UNIQUE", // This is the duplicate key
        valueFrom:
          "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:newkey::",
      },
      {
        name: "MORE_PLAIN",
        valueFrom:
          "arn:aws:secretsmanager:us-east-1:988857891049:secret:us-east-1/prototype/GDS_INSTANCES_PRIVATE_KEY-MORETHANSIX",
      },
    ];

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export THREE=something",
        "export UNIQUE=123", // Here it is again
        'export VARS="quoted string"',
        "dockerdeploy github/glg/streamliner/main:latest",
      ],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: JSON.stringify(secretsJson, null, 2).split("\n"),
      secretsJson,
    };

    const results = await noDupes(deployment);

    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Duplicate Export",
      path: "streamliner/secrets.json",
      line: 7,
      level: "failure",
      problems: [
        "The variable `UNIQUE` is already declared in orders on lines: **2**",
        "ECS will not allow a deployment where an environment variable is declared in both `orders` (environment config) and in `secrets.json` (secret config).",
      ],
    });
  });
});
