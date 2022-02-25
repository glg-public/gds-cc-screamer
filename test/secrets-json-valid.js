const { expect } = require("chai");
const secretsJsonIsValid = require("../checks/secrets-json-valid");

describe("secrets.json is valid check", () => {
  it("skips when there is no secrets.json", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts valid secrets.json files", async () => {
    const secretsJson = JSON.stringify(
      [
        {
          name: "JSON_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::",
        },
        {
          name: "OTHER_VALUE",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:newkey::",
        },
        {
          name: "MORE_PLAIN",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:988857891049:secret:us-east-1/prototype/GDS_INSTANCES_PRIVATE_KEY-MORETHANSIX",
        },
      ],
      null,
      2
    );

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(0);

    // When the secrets.json is valid, it gets attached to the orders object
    // so that future checks can rely on it without redoing work.
    expect(deployment.secretsJson).to.deep.equal(JSON.parse(secretsJson));
  });

  it("rejects secrets.json that is not valid JSON", async () => {
    const secretsJson = "invalid json";

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "secrets.json is not valid JSON",
      path: deployment.secretsJsonPath,
      problems: [
        `An error was encountered while trying to JSON parse ${deployment.secretsJsonPath}`,
      ],
      line: 0,
      level: "failure",
    });
  });

  it("rejects secrets.json that is not an array", async () => {
    const secretsJson = `{
      "JSON_SECRET": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::"
    }`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid secrets.json`,
      path: deployment.secretsJsonPath,
      problems: [
        "secrets.json must be an array of objects like `[{ name, valueFrom }]`",
      ],
      line: 1,
      level: "failure",
    });
  });

  it("rejects a secrets.json where any secret is not an object", async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:newkey::"
      },
      ["some array"]
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid secrets.json`,
      path: deployment.secretsJsonPath,
      problems: [
        "secrets.json must be an array of objects like `[{ name, valueFrom }]`",
      ],
      line: 1,
      level: "failure",
    });
  });

  it("rejects a secrets.json where any secret is missing a required key", async () => {
    const secretsJson = `[
      {
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:newkey::"
      }
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret Structure",
      path: deployment.secretsJsonPath,
      problems: ["Each secret must be an object like { name, valueFrom }"],
      line: {
        start: 2,
        end: 4,
      },
      level: "failure",
    });
  });

  it("rejects a secrets.json where any secret has non-required keys", async () => {
    const secretsJson = `[
      {
        "name": "MY_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:newkey::",
        "extraKey": "this shouldn't be here"
      }
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret Structure",
      path: deployment.secretsJsonPath,
      problems: [
        'Each secret must **only** contain the keys "name" and "valueFrom".',
      ],
      line: {
        start: 6,
        end: 10,
      },
      level: "failure",
    });
  });

  it("rejects a secrets.json if the arn is invalid", async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "dev/json_secret"
      }
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret: OTHER_VALUE",
      path: deployment.secretsJsonPath,
      problems: ["Invalid secret ARN: dev/json_secret"],
      line: {
        start: 6,
        end: 9,
      },
      level: "failure",
    });
  });

  it("rejects a secrets.json if a secret name ends in /-[a-zA-Z0-9]{6}/", async () => {
    const secretsJson = JSON.stringify(
      [
        {
          name: "JSON_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::",
        },
        {
          name: "OTHER_VALUE",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:newkey::",
        },
        {
          name: "MORE_PLAIN",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:988857891049:secret:us-east-1/prototype/GDS_INSTANCES_PRIVATE_KEY-46S5sl",
        },
        {
          name: "GDS_SESSION_GENERATOR_APP_TOKEN",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/GDS_APP_TOKEN_APOLLO-GIVE-FASTER:::",
        },
      ],
      null,
      2
    );

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment);
    expect(results.length).to.equal(2);
    expect(results[0].level).to.equal("failure");
  });
});
