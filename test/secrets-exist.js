const { expect } = require("chai");
const secretsExist = require("../checks/secrets-exist");

describe("Secrets Exist", () => {
  it("skips if there is not a valid secrets.json", async () => {
    const deployment = {
      serviceName: "streamliner",
    };

    const results = await secretsExist(deployment);

    expect(results.length).to.equal(0);
  });

  it("skips if there is no deployinator config", async () => {
    const deployment = {
      serviceName: "streamliner",
      secretsJson: [
        {
          name: "SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:868468680417:secret:prod/deployanator/github_token:::",
        },
      ],
    };

    const context = {};

    const inputs = {};

    const results = await secretsExist(deployment, context, inputs);

    expect(results.length).to.equal(0);
  });

  it("skips if the deployinator config doesn't work", async () => {
    const deployment = {
      serviceName: "streamliner",
      secretsJson: [
        {
          name: "SECRET",
          valueFrom:
            "arn:aws:secretsmanager:us-east-1:868468680417:secret:prod/deployanator/github_token:::",
        },
      ],
    };

    const context = {};

    const inputs = {
      deployinatorURL: "someurl",
      deployinatorToken: "abcdefg",
    };

    const localGet = async () => {
      throw new Error("It didn't work!");
    };

    const results = await secretsExist(deployment, context, inputs, localGet);

    expect(results.length).to.equal(0);
  });

  it("warns if a specified secret does not exist", async () => {
    const secretsJson = [
      {
        name: "SECRET",
        valueFrom:
          "arn:aws:secretsmanager:us-east-1:868468680417:secret:prod/deployanator/github_token:::",
      },
    ];
    const deployment = {
      serviceName: "streamliner",
      secretsJson,
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: JSON.stringify(secretsJson, null, 2).split("\n"),
    };

    const context = {};

    const inputs = {
      deployinatorURL: "someurl",
      deployinatorToken: "abcdefg",
    };

    const localGet = async () => {
      return [
        { name: "us-east-1/testsuite/PHRED-test" },
        { name: "us-east-1/developmentkeys/MARKLAR_DYNAMO_AWS_ACCESS_KEY" },
        { name: "us-east-1/testsuite/23ff0652-fc09-444b-a14d-d0d989c46cf8" },
        {
          name: "us-east-1/testsuite/f1b83d2f-35fb-4268-81db-2e501f0c79bc",
          description:
            "f1b83d2f-35fb-4268-81db-2e501f0c79bc is an object like { key }",
        },
        {
          name: "us-east-1/testsuite/97e33653-dad7-41b7-b140-d503445df4e4",
          description:
            "97e33653-dad7-41b7-b140-d503445df4e4 is an object like { key }",
        },
      ];
    };

    const results = await secretsExist(deployment, context, inputs, localGet);

    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Secret Could Not Be Found",
      level: "warning",
      line: 4,
      path: "streamliner/secrets.json",
      problems: [
        "The following secret could not be found: `prod/deployanator/github_token`",
      ],
    });
  });

  it("accepts a secrets.json that contains no non-existant secrets", async () => {
    const secretsJson = [
      {
        name: "SECRET",
        valueFrom:
          "arn:aws:secretsmanager:us-east-1:868468680417:secret:us-east-1/testsuite/PHRED-test:::",
      },
    ];
    const deployment = {
      serviceName: "streamliner",
      secretsJson,
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: JSON.stringify(secretsJson, null, 2).split("\n"),
    };

    const context = {};

    const inputs = {
      deployinatorURL: "someurl",
      deployinatorToken: "abcdefg",
    };

    const localGet = async () => {
      return [
        { name: "us-east-1/testsuite/PHRED-test" },
        { name: "us-east-1/developmentkeys/MARKLAR_DYNAMO_AWS_ACCESS_KEY" },
        { name: "us-east-1/testsuite/23ff0652-fc09-444b-a14d-d0d989c46cf8" },
        {
          name: "us-east-1/testsuite/f1b83d2f-35fb-4268-81db-2e501f0c79bc",
          description:
            "f1b83d2f-35fb-4268-81db-2e501f0c79bc is an object like { key }",
        },
        {
          name: "us-east-1/testsuite/97e33653-dad7-41b7-b140-d503445df4e4",
          description:
            "97e33653-dad7-41b7-b140-d503445df4e4 is an object like { key }",
        },
      ];
    };

    const results = await secretsExist(deployment, context, inputs, localGet);

    expect(results.length).to.equal(0);
  });

  it("works when the secret name includes a version tag", async () => {
    const secretsJson = [
      {
        name: "SECRET",
        valueFrom:
          "arn:aws:secretsmanager:us-east-1:868468680417:secret:us-east-1/devopsonly/GDS_INSTANCES_PRIVATE_KEY-JAPhnA",
      },
    ];
    const deployment = {
      serviceName: "streamliner",
      secretsJson,
      secretsJsonPath: "streamliner/secrets.json",
      secretsJsonContents: JSON.stringify(secretsJson, null, 2).split("\n"),
    };

    const context = {};

    const inputs = {
      deployinatorURL: "someurl",
      deployinatorToken: "abcdefg",
    };

    const localGet = async () => {
      return [
        { name: "us-east-1/testsuite/PHRED-test" },
        { name: "us-east-1/developmentkeys/MARKLAR_DYNAMO_AWS_ACCESS_KEY" },
        { name: "us-east-1/testsuite/23ff0652-fc09-444b-a14d-d0d989c46cf8" },
        {
          name: "us-east-1/testsuite/f1b83d2f-35fb-4268-81db-2e501f0c79bc",
          description:
            "f1b83d2f-35fb-4268-81db-2e501f0c79bc is an object like { key }",
        },
        {
          name: "us-east-1/devopsonly/GDS_INSTANCES_PRIVATE_KEY",
        },
        {
          name: "us-east-1/testsuite/97e33653-dad7-41b7-b140-d503445df4e4",
          description:
            "97e33653-dad7-41b7-b140-d503445df4e4 is an object like { key }",
        },
      ];
    };

    const results = await secretsExist(deployment, context, inputs, localGet);

    expect(results.length).to.equal(0);
  });
});
