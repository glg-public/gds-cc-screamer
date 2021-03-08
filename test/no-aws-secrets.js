const { expect } = require("chai");
const noAWSSecrets = require("../checks/no-aws-secrets");

describe("No AWS Secrets", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await noAWSSecrets(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts orders with no aws config", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export AWS_REGION=cn-north-1",
        "export AWS_DEFAULT_REGION=eu-west-2",
        "export ACCOUNT_ID=12345678",
      ],
    };

    const results = await noAWSSecrets(deployment);
    expect(results.length).to.equal(0);
  });

  it("warns for the presence of AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export AWS_REGION=cn-north-1",
        "export AWS_DEFAULT_REGION=eu-west-2",
        "export ACCOUNT_ID=12345678",
        "export AWS_ACCESS_KEY_ID=$(secrets ACCESS_KEY)",
        "export AWS_SECRET_ACCESS_KEY=$(secrets SECRET_KEY)",
      ],
    };

    const results = await noAWSSecrets(deployment);
    expect(results.length).to.equal(2);

    expect(results[0]).to.deep.equal({
      title: "Remove AWS Config from your orders file.",
      line: 4,
      level: "warning",
      problems: [
        "You should rely on the container's role, which you can define with `policy.json`, rather than explicitly declaring AWS credentials.",
      ],
      path: deployment.ordersPath,
    });

    expect(results[1]).to.deep.equal({
      title: "Remove AWS Config from your orders file.",
      line: 5,
      level: "warning",
      problems: [
        "You should rely on the container's role, which you can define with `policy.json`, rather than explicitly declaring AWS credentials.",
      ],
      path: deployment.ordersPath,
    });
  });

  it("fails when actual secret values are present", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export AWS_REGION=cn-north-1",
        "export AWS_DEFAULT_REGION=eu-west-2",
        "export ACCOUNT_ID=12345678",
        "export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE",
        "export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      ],
    };

    const results = await noAWSSecrets(deployment);
    expect(results.length).to.equal(2);

    expect(results[0]).to.deep.equal({
      title: "Remove AWS Config from your orders file.",
      line: 4,
      level: "failure",
      problems: [
        "You should rely on the container's role, which you can define with `policy.json`, rather than explicitly declaring AWS credentials.",
        "Remove this Access Key ID from your orders file.",
      ],
      path: deployment.ordersPath,
    });

    expect(results[1]).to.deep.equal({
      title: "Remove AWS Config from your orders file.",
      line: 5,
      level: "failure",
      problems: [
        "You should rely on the container's role, which you can define with `policy.json`, rather than explicitly declaring AWS credentials.",
        "Remove this Secret Access Key from your orders file.",
      ],
      path: deployment.ordersPath,
    });
  });

  it("does not flag a git sha in a deploy line", async () => {
    const deployment = {
      serviceName: "marketingtestcanary",
      ordersPath: "marketingtestcanary/orders",
      ordersContents: [
        "# This job is for testing CI/CD things only",
        "",
        "# Env vars",
        "export LOG_LEVEL=info",
        "",
        "export ECS_SCHEDULED_TASK_CRON='0 22 * * *'",
        "jobdeploy github/glg/marketing-test/main:aca02d0a803c7115887a8aa59ce2b09f8b739108"
      ]
    }

    const results = await noAWSSecrets(deployment);
    expect(results.length).to.equal(0);
  });

  it("does not flag New Relic keys as AWS keys", async () => {
    const deployment = {
      serviceName: "marketingtestcanary",
      ordersPath: "marketingtestcanary/orders",
      ordersContents: [
        // this is not real
        "export NEW_RELIC_LICENSE_KEY=afd8d93b8483a9963dc70b24bf1cf79e53ceb569" 
      ]
    }

    const results = await noAWSSecrets(deployment);
    expect(results.length).to.equal(0);
  });
});
