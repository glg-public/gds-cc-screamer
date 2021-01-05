const { expect } = require("chai");
const noCarriageReturn = require("../checks/no-carriage-return");

describe("No Carriage Return", () => {
  it("accepts a file with no carriage returns", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export VAR=value", "# A comment", "export VARZ=valuez"],
    };

    const results = await noCarriageReturn(deployment);
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

    const results = await noCarriageReturn(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "No Carriage Return Characters",
      problems: [
        `\`${deployment.ordersPath}\` contains invalid newline characters.`,
        "You must use Unix-type newlines (`LF`). Windows-type newlines (`CRLF`) are not permitted.",
      ],
      line: 0,
      level: "failure",
      path: deployment.ordersPath,
    });
  });

  it("Rejects secrets.json with CRLF", async () => {
    const secretsJson = `[\r
      {\r
        "name": "JSON_SECRET",\r
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"\r
      },\r
      {\r
        "name": "OTHER_VALUE",\r
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"\r
      }\r
    ]`;

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export VAR=value", "# A comment", "export VARZ=valuez"],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: secretsJson.split("\n"),
    };

    const results = await noCarriageReturn(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "No Carriage Return Characters",
      problems: [
        `\`${deployment.secretsJsonPath}\` contains invalid newline characters.`,
        "You must use Unix-type newlines (`LF`). Windows-type newlines (`CRLF`) are not permitted.",
      ],
      line: 0,
      level: "failure",
      path: deployment.secretsJsonPath,
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
              "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret",
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

    const results = await noCarriageReturn(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "No Carriage Return Characters",
      problems: [
        `\`${deployment.policyJsonPath}\` contains invalid newline characters.`,
        "You must use Unix-type newlines (`LF`). Windows-type newlines (`CRLF`) are not permitted.",
      ],
      line: 0,
      level: "failure",
      path: deployment.policyJsonPath,
    });
  });
});
