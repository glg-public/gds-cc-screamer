const { expect } = require("chai");
const secretsJsonIsValid = require("../checks/secrets-json-valid");

const inputs = {
  awsAccount: 12345678,
  secretsPrefix: "cn-north-1/production/",
  awsRegion: "cn-north-1",
  awsPartition: "aws-cn"
};

describe("secrets.json is valid check", () => {
  it("skips when there is no secrets.json", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
    };

    const results = await secretsJsonIsValid(deployment, {}, inputs);
    expect(results.length).to.equal(0);
  });

  it("accepts valid secrets.json files", async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:newkey::"
      },
      {
        "name": "MORE_PLAIN",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:cn-north-1/prototype/GDS_INSTANCES_PRIVATE_KEY-46S5sl"
      }
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment, {}, inputs);
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

    const results = await secretsJsonIsValid(deployment, {}, inputs);
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
      "JSON_SECRET": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"
    }`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment, {}, inputs);
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
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:newkey::"
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

    const results = await secretsJsonIsValid(deployment, {}, inputs);
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
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:newkey::"
      }
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment, {}, inputs);
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
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:newkey::",
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

    const results = await secretsJsonIsValid(deployment, {}, inputs);
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
        "name": "OTHER_SECRET",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:cn-north-1/production/SOMETHING:::"
      },
      {
        "name": "SECRET_KEY",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:cn-north-1/production/MY_SECRET:myKey::"
      },
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"
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

    const results = await secretsJsonIsValid(deployment, {}, inputs);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret: OTHER_VALUE",
      path: deployment.secretsJsonPath,
      problems: ["Invalid secret ARN: dev/json_secret"],
      line: {
        start: 14,
        end: 17,
      },
      level: "failure",
    });
  });

  it("rejects a secrets.json if has used aws as partition for AWS China", async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"
      }
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment, {}, inputs);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret: JSON_SECRET",
      path: deployment.secretsJsonPath,
      problems: ["Invalid secret ARN: arn:aws:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"],
      line: {
        start: 2,
        end: 5,
      },
      level: "failure",
    });
  });

  it("rejects a secrets.json if has used aws as partition for AWS China", async () => {
    const secretsJson = `[
    {
      "name": "SECRET_KEY",
      "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:cn-north-1/production/MY_SECRET:myKey::"
    },
    {
      "name": "OTHER_SECRET",
      "valueFrom": "arn:aws-cn:secretsmanager:cn-north-1:12345678:secret:cn-north-1/production/SOMETHING:::"
    },
    {
      "name": "MORE_KEY",
      "valueFrom": "arn:aws:secretsmanager:cn-north-1:12345678:secret:cn-north-1/production/PANTS:belt::"
    },
    {
      "name": "ONE_MORE",
      "valueFrom": "arn:aws:secretsmanager:cn-north-1:12345678:secret:cn-north-1/production/PANTS:::"
    }]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(deployment, {}, inputs);
    expect(results.length).to.equal(2);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret: MORE_KEY",
      path: deployment.secretsJsonPath,
      problems: ["Invalid secret ARN: arn:aws:secretsmanager:cn-north-1:12345678:secret:cn-north-1/production/PANTS:belt::"],
      line: {
        start: 10,
        end: 13,
      },
      level: "failure",
    });
    expect(results[1]).to.deep.equal({
      title: "Invalid Secret: JSON_SECRET",
      path: deployment.secretsJsonPath,
      problems: ["Invalid secret ARN: arn:aws:secretsmanager:cn-north-1:12345678:secret:dev/json_secret:example::"],
      line: {
        start: 2,
        end: 5,
      },
      level: "failure",
    });
  });
});
