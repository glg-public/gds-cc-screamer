const { expect } = require("chai");
const restrictedBuckets = require("../checks/restricted-buckets");

describe("Restricted Buckets", () => {
  it("skips if there is no policy.json or an invalid policy.json", async () => {
    const deployment = {
      serviceName: "bucker-abuser",
    };

    const results = await restrictedBuckets(deployment, undefined, {});

    expect(results.length).to.equal(0);
  });

  it("skips if there are no restricted buckets configured", async () => {
    const policyJson = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AccessForbiddenBucket",
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: [
            "arn:aws:s3:::forbidden/*",
            "arn:aws:s3:::nope/someprefix",
          ],
        },
      ],
    };
    const deployment = {
      serviceName: "bucker-abuser",
      policyJson,
      policyJsonContents: JSON.stringify(policyJson, null, 2).split("\n"),
      policyJsonPath: "bucket-abuser/policy.json",
    };

    const results = await restrictedBuckets(deployment, undefined, {});

    expect(results.length).to.equal(0);
  });

  it("Blocks when a policy includes access to a restricted bucket", async () => {
    const policyJson = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AccessForbiddenBucket",
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: [
            "arn:aws:s3:::forbidden/*",
            "arn:aws:s3:::nope/someprefix",
          ],
        },
      ],
    };
    const deployment = {
      serviceName: "bucker-abuser",
      policyJson,
      policyJsonContents: JSON.stringify(policyJson, null, 2).split("\n"),
      policyJsonPath: "bucket-abuser/policy.json",
    };

    const inputs = {
      restrictedBuckets: "forbidden/*,nope/*",
    };

    const results = await restrictedBuckets(deployment, undefined, inputs);

    expect(results.length).to.equal(2);
    expect(results[0].level).to.equal("failure");
    expect(results[0].path).to.equal(deployment.policyJsonPath);
    expect(results[0].line).to.equal(9);

    expect(results[1].level).to.equal("failure");
    expect(results[1].path).to.equal(deployment.policyJsonPath);
    expect(results[1].line).to.equal(10);
  });

  it("Blocks when a policy includes access to a restricted prefix", async () => {
    const policyJson = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AccessForbiddenBucket",
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: ["arn:aws:s3:::glg-app-data/forbidden"],
        },
      ],
    };

    const deployment = {
      serviceName: "bucker-abuser",
      policyJson,
      policyJsonContents: JSON.stringify(policyJson, null, 2).split("\n"),
      policyJsonPath: "bucket-abuser/policy.json",
    };

    const inputs = {
      restrictedBuckets: "glg-app-data/forbidden",
    };

    const results = await restrictedBuckets(deployment, undefined, inputs);

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].path).to.equal(deployment.policyJsonPath);
    expect(results[0].line).to.equal(9);
  });

  it("Allows an s3 policy that doesn't include any forbidden buckets or prefixes", async () => {
    const policyJson = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AccessForbiddenBucket",
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: ["arn:aws:s3:::glg-app-data/allowed"],
        },
      ],
    };

    const deployment = {
      serviceName: "bucker-abuser",
      policyJson,
      policyJsonContents: JSON.stringify(policyJson, null, 2).split("\n"),
      policyJsonPath: "bucket-abuser/policy.json",
    };

    const inputs = {
      restrictedBuckets: "forbidden/*,nope/*,glg-app-data/somethingelse",
    };

    const results = await restrictedBuckets(deployment, undefined, inputs);

    expect(results.length).to.equal(0);
  });
});
