const { expect } = require("chai");
const noAWSSecrets = require("../checks/no-aws-secrets");

describe("No AWS Secrets", () => {
  it("accepts orders with no aws config", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export AWS_REGION=us-east-1",
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
        "export AWS_REGION=us-east-1",
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
        "export AWS_REGION=us-east-1",
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
});
