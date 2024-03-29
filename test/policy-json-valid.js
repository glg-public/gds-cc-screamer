const { expect } = require("chai");
const policyJsonIsValid = require("../checks/policy-json-valid");
const {
  suggest,
  codeBlock,
  getNewFileLink,
  getOwnerRepoBranch,
} = require("../util");
const fs = require("fs").promises;
const path = require("path");

const fixturesDir = path.join(process.cwd(), "test", "fixtures");

const actionFmtError =
  '"Action" must be either a valid [Action String](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), or an array of valid action strings. SRE recommends as specific of an Action String as possible.';
const resourceFmtError =
  '"Resource" must be either a valid [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html), or an array of valid ARNs. SRE recommends as specific of an ARN as possible.';

describe("policy.json is valid", () => {
  it("skips if there is no policy.json", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts valid policy.json #1", async () => {
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
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts valid policy.json #2", async () => {
    const policyJson = await fs.readFile(
      path.join(fixturesDir, "issues51-53", "policy.json"),
      "utf8"
    );
    const secretsJson = await fs.readFile(
      path.join(fixturesDir, "issues51-53", "secrets.json"),
      "utf8"
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJson: JSON.parse(secretsJson),
      secretsJsonContents: secretsJson.split("\n"),
      secretsJsonPath: "streamliner/secrets.json",
    };

    const results = await policyJsonIsValid(deployment);
    const failures = results.filter(({ level }) => level === "failure");
    expect(failures.length).to.equal(0);
  });

  it("accepts valid policy.json #3", async () => {
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
            Resource: [
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret-??????",
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else-??????",
            ],
          },
        ],
      },
      null,
      2
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJsonContents: [], // indicates presence of a secrets.json
      secretsJson: [
        {
          name: "MY_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:::",
        },
        {
          name: "MY_OTHER_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else:::",
        },
      ],
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects policy.json that is not valid JSON", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: ["not valid json"],
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "policy.json is not valid JSON",
      path: deployment.policyJsonPath,
      problems: [
        `An error was encountered while trying to JSON parse ${deployment.policyJsonPath}`,
      ],
      line: 0,
      level: "failure",
    });
  });

  it("rejects policy.json that is not an Object", async () => {
    const policyJson = JSON.stringify(
      [
        {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: "resource:action",
              Resource:
                "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
            },
          ],
        },
      ],
      null,
      2
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid policy.json`,
      path: deployment.policyJsonPath,
      problems: ["policy.json must be a valid AWS IAM Policy"],
      line: 1,
      level: "failure",
    });
  });

  it("rejects policy.json with capitalization errors", async () => {
    const policyJson = JSON.stringify(
      {
        version: "2012-10-17",
        statement: [
          {
            effect: "Allow",
            action: [
              "ecr:GetAuthorizationToken",
              "ecr:BatchCheckLayerAvailability",
              "ecr:GetDownloadUrlForLayer",
              "ecr:BatchGetImage",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "secretsmanager:GetSecretValue",
            ],
            resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
        ],
      },
      null,
      2
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(5);

    const [version, statement, effect, action, resource] = results;

    expect(version).to.deep.equal({
      title: "Statement must be capitalized",
      path: deployment.policyJsonPath,
      problems: [suggest("Capitalize this key", '  "Version": "2012-10-17",')],
      line: 2,
      level: "failure",
    });

    expect(statement).to.deep.equal({
      title: "Statement must be capitalized",
      path: deployment.policyJsonPath,
      problems: [suggest("Capitalize this key", '  "Statement": [')],
      line: 3,
      level: "failure",
    });

    expect(effect).to.deep.equal({
      title: "Statement must be capitalized",
      path: deployment.policyJsonPath,
      problems: [suggest("Capitalize this key", '      "Effect": "Allow",')],
      line: 5,
      level: "failure",
    });

    expect(action).to.deep.equal({
      title: "Statement must be capitalized",
      path: deployment.policyJsonPath,
      problems: [suggest("Capitalize this key", '      "Action": [')],
      line: 6,
      level: "failure",
    });

    expect(resource).to.deep.equal({
      title: "Statement must be capitalized",
      path: deployment.policyJsonPath,
      problems: [
        suggest(
          "Capitalize this key",
          '      "Resource": "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret"'
        ),
      ],
      line: 15,
      level: "failure",
    });
  });

  it("rejects policy.json that is missing Version", async () => {
    const policyJson = JSON.stringify(
      {
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
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Policy must have a "Version" field',
      path: deployment.policyJsonPath,
      problems: ['"Version" is a required field.'],
      line: 0,
      level: "failure",
    });
  });

  it("rejects policy.json with an invalid version", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2.6",
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
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Version",
      path: deployment.policyJsonPath,
      problems: ["Version must be one of: 2008-10-17, 2012-10-17"],
      line: 2,
      level: "failure",
    });
  });

  it("rejects policy.json that is missing a Statement block", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
      },
      null,
      2
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Policy must have a "Statement" block.',
      path: deployment.policyJsonPath,
      problems: ['"Statement" is a required field'],
      line: 0,
      level: "failure",
    });
  });

  it("rejects policy.json where any statement block is missing required fields", async () => {
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
          {
            Action: "resource:action",
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
        ],
      },
      null,
      2
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Statement is missing required fields.",
      path: "streamliner/policy.json",
      problems: [
        'All policy statements must include an "Effect" field. Must be "Allow" or "Deny"',
      ],
      level: "failure",
      line: { start: 17, end: 20 },
    });
  });

  it("rejects policy.json where any statement block has an invalid Effect", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "resource:action",
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
          {
            Effect: "allow", // This needs to be capitalized
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
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Effect"',
      path: "streamliner/policy.json",
      problems: ['"Effect" must be one of: Allow, Deny'],
      line: 10,
      level: "failure",
    });
  });

  it("rejects policy.json where any statement block has an invalid Action", async () => {
    let policyJson = JSON.stringify(
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
          {
            Effect: "Allow",
            Action: "wrong",
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
        ],
      },
      null,
      2
    );
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    let results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Action"',
      path: "streamliner/policy.json",
      problems: [actionFmtError],
      line: 19,
      level: "failure",
    });

    policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "resource:action",
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
          {
            Effect: "Allow",
            Action: [
              "resource:*",
              "wrong",
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
    );

    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "failure"
    );
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Action"',
      path: "streamliner/policy.json",
      problems: [actionFmtError],
      line: 13,
      level: "failure",
    });
  });

  it("rejects policy.json where any statement block contains an invalid Resource", async () => {
    let policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "resource:action",
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
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
            Resource: "wrong",
          },
        ],
      },
      null,
      2
    );
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    let results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Resource"',
      path: deployment.policyJsonPath,
      problems: [resourceFmtError],
      line: 20,
      level: "failure",
    });

    policyJson = JSON.stringify(
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
          {
            Effect: "Allow",
            Action: ["resource:*", "other:action"],
            Resource: [
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
              "wrong",
            ],
          },
        ],
      },
      null,
      2
    );

    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "failure"
    );
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Resource"',
      path: deployment.policyJsonPath,
      problems: [resourceFmtError],
      line: 25,
      level: "failure",
    });
  });

  it("rejects policy.json where any statement block has an invalid Sid", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "no-hyphens",
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
            Resource: [
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret-??????",
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else-??????",
            ],
          },
        ],
      },
      null,
      2
    );
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    let results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Sid"',
      path: "streamliner/policy.json",
      problems: [
        "Statement IDs (SID) must be alpha-numeric. Check that your input satisfies the regular expression `/^[0-9A-Za-z]*$/`",
      ],
      line: 5,
      level: "failure",
    });
  });

  it('requires the "secretsmanager:GetSecretValue" action if a secrets.json is present', async () => {
    let policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "resource:action",
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
          {
            Effect: "Allow",
            Action: [
              "ecr:*", // supports wildcard actions
              "logs:*",
            ],
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
        ],
      },
      null,
      2
    );
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJsonContents: [], // indicates presence of a secrets.json
    };

    let results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "failure"
    );
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Policy is missing required actions",
      path: "streamliner/policy.json",
      problems: [
        "To run in GDS, your service requires the secretsmanager:GetSecretValue action.",
      ],
      line: 0,
      level: "failure",
    });
  });

  it("requires all secrets in secrets.json to be present in policy.json", async () => {
    let policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "secretsmanager:GetSecretValue",
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret-??????",
          },
          {
            Effect: "Allow",
            Action: [
              "ecr:*", // supports wildcard actions
              "logs:*",
            ],
            Resource: "*",
          },
        ],
      },
      null,
      2
    );
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJsonContents: [], // indicates presence of a secrets.json
      secretsJson: [
        {
          name: "MY_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:::",
        },
        {
          name: "MY_OTHER_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else:::",
        },
      ],
    };
    let results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "failure"
    );
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Policy is missing required secrets",
      path: "streamliner/policy.json",
      problems: [
        "Your secrets.json requests arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else-??????, but your policy does not allow access.",
        "Add the following statement block\n" +
          "```suggestion\n" +
          "    },\n" +
          "    {\n" +
          '      "Sid": "AllowSecretsAccess",\n' +
          '      "Effect": "Allow",\n' +
          '      "Action": "secretsmanager:GetSecretValue",\n' +
          '      "Resource": [\n' +
          '        "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else-??????"\n' +
          "      ]\n" +
          "    }\n" +
          "```",
      ],
      line: 16,
      level: "failure",
    });

    // It does work if your policy includes the required secrets
    policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "secretsmanager:GetSecretValue",
            Resource: [
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret-??????",
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else-??????",
            ], // supports wildcards
          },
          {
            Effect: "Allow",
            Action: [
              "ecr:*", // supports wildcard actions
              "logs:*",
            ],
            Resource: "*",
          },
        ],
      },
      null,
      2
    );
    deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJsonContents: [], // indicates presence of a secrets.json
      secretsJson: [
        {
          name: "MY_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::",
        },
        {
          name: "MY_OTHER_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else:::",
        },
      ],
    };
    results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "failure"
    );
    expect(results.length).to.equal(0);
  });

  it("suggests a secret version suffix if one is missing", async () => {
    let policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "secretsmanager:GetSecretValue",
            Resource: [
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else",
            ],
          },
          {
            Effect: "Allow",
            Action: [
              "ecr:*", // supports wildcard actions
              "logs:*",
            ],
            Resource: "*",
          },
        ],
      },
      null,
      2
    );
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJsonContents: [], // indicates presence of a secrets.json
      secretsJson: [
        {
          name: "MY_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:::",
        },
        {
          name: "MY_OTHER_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else:::",
        },
      ],
    };
    let results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "failure"
    );
    expect(results.length).to.equal(2);

    expect(results[0]).to.deep.equal({
      title: "Add a version suffix to this secret ARN",
      problems: [
        suggest(
          "IAM policies should specifiy a version suffix for secrets. This can be `??????` when you always want the latest version.",
          deployment.policyJsonContents[7].replace(
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret-??????"
          )
        ),
      ],
      line: 8,
      level: "failure",
      path: deployment.policyJsonPath,
    });

    expect(results[1]).to.deep.equal({
      title: "Add a version suffix to this secret ARN",
      problems: [
        suggest(
          "IAM policies should specifiy a version suffix for secrets. This can be `??????` when you always want the latest version.",
          deployment.policyJsonContents[8].replace(
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else",
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else-??????"
          )
        ),
      ],
      line: 9,
      level: "failure",
      path: deployment.policyJsonPath,
    });
  });

  it("warns about overly broad policies", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "secretsmanager:GetSecretValue",
            Resource: "arn:aws:secretsmanager:us-east-1:111111111111:secret:*", // supports wildcards
          },
          {
            Effect: "Allow",
            Action: [
              "ecr:*", // supports wildcard actions, but warns about them
              "logs:*",
            ],
            Resource: "*", // supports wildcard resources, but warns about them
          },
        ],
      },
      null,
      2
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJsonContents: [], // indicates presence of a secrets.json
      secretsJson: [
        {
          name: "MY_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::",
        },
        {
          name: "MY_OTHER_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else:::",
        },
      ],
    };
    const results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "warning"
    );
    expect(results.length).to.equal(3);
    const problem =
      "It is best practice to be as specific as possible with your IAM Policies. Overly broad policies can lead to unintentional vulnerabilities.";

    expect(results[0]).to.deep.equal({
      title: "Broad Permissions",
      level: "warning",
      line: 12,
      path: deployment.policyJsonPath,
      problems: [problem],
    });

    expect(results[1]).to.deep.equal({
      title: "Broad Permissions",
      level: "warning",
      line: 13,
      path: deployment.policyJsonPath,
      problems: [problem],
    });

    expect(results[2]).to.deep.equal({
      title: "Broad Permissions",
      level: "warning",
      line: 15,
      path: deployment.policyJsonPath,
      problems: [problem],
    });
  });

  it("warns about delete access", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "secretsmanager:GetSecretValue",
            Resource: "arn:aws:secretsmanager:us-east-1:111111111111:secret:*", // supports wildcards
          },
          {
            Effect: "Allow",
            Action: [
              "ecr:DeleteSomething", // will warn about this delete
            ],
            Resource: "arn:aws:secretsmanager:us-east-1:111111111111:secret:*", // doesn't care that this is the wrong resource type
          },
        ],
      },
      null,
      2
    );
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
      secretsJsonContents: [], // indicates presence of a secrets.json
      secretsJson: [
        {
          name: "MY_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::",
        },
        {
          name: "MY_OTHER_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else:::",
        },
      ],
    };
    const results = (await policyJsonIsValid(deployment)).filter(
      ({ level }) => level === "warning"
    );
    expect(results.length).to.equal(1);
    const problem =
      "It is extremely rare that a service needs Delete access. Make sure you have discussed this with SRE before merging.";

    expect(results[0]).to.deep.equal({
      title: "Delete Access",
      level: "warning",
      line: 12,
      path: deployment.policyJsonPath,
      problems: [problem],
    });
  });

  it("proposes creating a new policy.json file if one is needed and not present", async () => {
    const deployment = {
      serviceName: "streamliner",
      secretsJson: [
        {
          name: "MY_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret:example::",
        },
        {
          name: "MY_OTHER_SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else:::abcdef",
        },
      ],
    };

    const pr = require("./fixtures/pull-request.json");
    const context = {
      payload: {
        pull_request: pr,
      },
    };

    const results = await policyJsonIsValid(deployment, context);
    expect(results.length).to.equal(1);

    const expectedPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AllowSecretsAccess",
          Effect: "Allow",
          Action: "secretsmanager:GetSecretValue",
          Resource: [
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret-??????",
            "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/something_else-abcdef",
          ],
        },
      ],
    };

    const policyText = JSON.stringify(expectedPolicy, null, 2);
    const { owner, repo, branch } = getOwnerRepoBranch(context);
    const newFileLink = getNewFileLink({
      owner,
      repo,
      branch,
      filename: "streamliner/policy.json",
      value: policyText,
    });
    expect(results[0]).to.deep.equal({
      title: "Create a policy.json",
      level: "failure",
      line: 0,
      problems: [
        `Add a new file, \`streamliner/policy.json\`, that contains the following:\n${codeBlock(
          policyText,
          "json"
        )}\n[Click To Add File](${newFileLink})`,
      ],
    });
  });

  it("rejects a policy.json where there are duplicate Sids", async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowSecretsAccess",
            Effect: "Allow",
            Action: "secretsmanager:GetSecretValue",
            Resource: [
              "arn:aws:secretsmanager:us-east-1:868468680417:secret:prod/gds-betas/github-token-??????",
            ],
          },
          {
            Sid: "SQS",
            Effect: "Allow",
            Action: ["sqs:GetQueueUrl", "sqs:SendMessage"],
            Resource: [
              "arn:aws:sqs:us-east-1:868468680417:gds-betas-update-queue.fifo",
            ],
          },
          {
            Sid: "SQS", // Duplicate Sid
            Effect: "Allow",
            Action: ["sqs:GetMessage"],
            Resource: [
              "arn:aws:sqs:us-east-1:868468680417:gds-betas-update-queue.fifo",
            ],
          },
        ],
      },
      null,
      2
    );

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [],
      policyJsonPath: "streamliner/policy.json",
      policyJsonContents: policyJson.split("\n"),
    };

    const results = await policyJsonIsValid(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "`Sid` Must Be Unique",
      path: "streamliner/policy.json",
      line: 24,
      level: "failure",
      problems: ["`Sid` must be unique within each policy."],
    });
  });
});
