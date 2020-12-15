const { expect } = require("chai");
const secretsJsonIsValid = require("../checks/secrets-json-valid");

describe("secrets.json is valid check", () => {
  it("skips when there is no secrets.json", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: [],
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(0);
  });

  it("accepts valid secrets.json files", async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"
      }
    ]`;

    const orders = {
      path: "streamliner/orders",
      contents: [],
      secretsPath: "streamliner/secrets.json",
      secretsContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(0);

    // When the secrets.json is valid, it gets attached to the orders object
    // so that future checks can rely on it without redoing work.
    expect(orders.secretsJson).to.deep.equal(JSON.parse(secretsJson));
  });

  it("rejects secrets.json that is not valid JSON", async () => {
    const secretsJson = "invalid json";

    const orders = {
      path: "streamliner/orders",
      contents: [],
      secretsPath: "streamliner/secrets.json",
      secretsContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "secrets.json is not valid JSON",
      path: orders.secretsPath,
      problems: [
        `An error was encountered while trying to JSON parse ${orders.secretsPath}`,
      ],
      line: 0,
      level: "failure",
    });
  });

  it("rejects secrets.json that is not an array", async () => {
    const secretsJson = `{
      "JSON_SECRET": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
    }`;

    const orders = {
      path: "streamliner/orders",
      contents: [],
      secretsPath: "streamliner/secrets.json",
      secretsContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid secrets.json`,
      path: orders.secretsPath,
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
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"
      },
      ["some array"]
    ]`;

    const orders = {
      path: "streamliner/orders",
      contents: [],
      secretsPath: "streamliner/secrets.json",
      secretsContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid secrets.json`,
      path: orders.secretsPath,
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
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"
      }
    ]`;

    const orders = {
      path: "streamliner/orders",
      contents: [],
      secretsPath: "streamliner/secrets.json",
      secretsContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret Structure",
      path: orders.secretsPath,
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
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::",
        "extraKey": "this shouldn't be here"
      }
    ]`;

    const orders = {
      path: "streamliner/orders",
      contents: [],
      secretsPath: "streamliner/secrets.json",
      secretsContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret Structure",
      path: orders.secretsPath,
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
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "dev/json_secret"
      }
    ]`;

    const orders = {
      path: "streamliner/orders",
      contents: [],
      secretsPath: "streamliner/secrets.json",
      secretsContents: secretsJson.split("\n"),
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret: OTHER_VALUE",
      path: orders.secretsPath,
      problems: ["Invalid secret ARN: dev/json_secret"],
      line: {
        start: 6,
        end: 9,
      },
      level: "failure",
    });
  });
});
