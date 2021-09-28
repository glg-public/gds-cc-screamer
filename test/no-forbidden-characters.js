const { expect } = require("chai");
const noForbiddenCharacters = require("../checks/no-forbidden-characters");

describe("No Forbidden Characters", () => {
  it("accepts a file with no carriage returns", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export VAR=value", "# A comment", "export VARZ=valuez"],
    };

    const results = await noForbiddenCharacters(deployment);
    expect(results.length).to.equal(0);
  });

  it("Rejects Orders file with CRLF", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export VAR=value\r",
        "# A comment\r",
        "export VARZ=valuez\r",
      ],
    };

    const results = await noForbiddenCharacters(deployment);
    expect(results.length).to.equal(3);
    results.forEach((result) => {
      expect(result.problems[0]).to.match(/invalid newline/);
    });
  });

  it("Rejects secrets.json with CRLF", async () => {
    const secretsJson = `[\r
      {\r
        "name": "JSON_SECRET",\r
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::"\r
      },\r
      {\r
        "name": "OTHER_VALUE",\r
        "valueFrom": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:newkey::"\r
      }\r
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export VAR=value", "# A comment", "export VARZ=valuez"],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await noForbiddenCharacters(deployment);
    expect(results.length).to.equal(9);
    results.forEach((result) => {
      expect(result.problems[0]).to.match(/invalid newline/);
    });
  });

  it("Rejects policy.json with CRLF", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "ecr:GetAuthorizationToken",
              "ecr:BatchCheckLayerAvailability",
              "ecr:GetDownloadUrlForLayer",
              "ecr:BatchGetImage",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "secretsmanager:GetSecretValue",
            ],
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
        ],
      },
      null,
      2
    ).replace(/\n/g, "\r\n");

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export VAR=value", "# A comment", "export VARZ=valuez"],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await noForbiddenCharacters(deployment);
    expect(results.length).to.equal(17);
    results.forEach((result) => {
      expect(result.problems[0]).to.match(/invalid newline/);
    });
  });

  it("rejects files with a null character", async () => {
    const orders = `export SECURITY_MODE="public"
    export HEALTHCHECK="/diagnostic"
    export AUTH_BOUNCE_URL="https://session.glgresearch.com/bounce/bounceme"
    ￼
    dockerdeploy github/glg-public/bounce/master:latest`;

    const deployment = {
      ordersContents: orders.split("\n"),
      ordersPath: "bounce/orders",
    };
    const results = await noForbiddenCharacters(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].problems[0]).to.match(/null character/);
  });
});
