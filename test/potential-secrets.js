const { expect } = require("chai");
const fs = require("fs").promises;
const path = require("path");
const potentialSecrets = require("../checks/potential-secrets");

const fixtures = path.join(process.cwd(), "test", "fixtures");

describe("Potential Secrets", () => {
  it("skips if no orderes", async () => {
    const deployment = {
      serviceName: "streamliner",
    };

    const results = await potentialSecrets(deployment);

    expect(results.length).to.equal(0);
  });

  it('warns for environment variables that contain "password"', async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export SFDC_PASSWORD='fm*pSktP-UG!Fg?\"Q?\\k%H4a'"],
    };

    const results = await potentialSecrets(deployment);

    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      level: "warning",
      path: "streamliner/orders",
      line: 1,
      problems: [
        "This looks like it might be a secret. You should probably store this in AWS Secrets Manager.",
      ],
      title: "Passwords Should Be In Secrets Manager",
    });
  });

  it('warns for environment variables that contain "secret"', async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export SECRET_KEY='>*c)2{A]KcZ&H(reADXa57d/'"],
    };

    const results = await potentialSecrets(deployment);

    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      level: "warning",
      path: "streamliner/orders",
      line: 1,
      problems: [
        "This looks like it might be a secret. You should probably store this in AWS Secrets Manager.",
      ],
      title: "Secrets Should Be In Secrets Manager",
    });
  });

  it('should ignore known variables named "secret" with secret contents', async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        'export SECRETS_AWS_REGION="us-east-1"',
        'export SECRETS_CREDENTIAL_SOURCE="ims"',
        'export SECRETS_LOG_LEVEL="error"',
        'export SECRETS_NAMESPACE="production"',
      ],
    };

    expect(await potentialSecrets(deployment)).to.have.lengthOf(0);
  });

  it("warns for environment variables with high entropy", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export CATS='RPp{2wTzvG8j4^9Du^r~_e%W'",
        "export PANTS='>*c)2{A]KcZ&H(reADXa57d/'",
        "export SANDWICH='fm*pSktP-UG!Fg?\"Q?\\k%H4a'",
        "export CHICKEN='L.tWfz^h~f9r/Tr,'",
        "export DOG='p8)x&JD;ET'",
      ],
    };

    const results = await potentialSecrets(deployment);
    const exclusionVars = ["CATS", "PANTS", "SANDWICH", "CHICKEN", "DOG"];

    expect(results.length).to.equal(deployment.ordersContents.length);
    results.forEach((result, i) => {
      const problem = `This was flagged as \`isStrongPassword\`. If this is definitely not a secret, update \`.ccscreamer.json\` to include the following:
\`\`\`json
{
  "streamliner": {
    "potentialSecrets": {
      "exclusions": [
        "${exclusionVars[i]}"
      ]
    }
  }
}
\`\`\`
[Documentation](https://github.com/glg-public/gds-cc-screamer#potentialsecretsexclusions)`;

      expect(result).to.deep.equal({
        level: "warning",
        path: "streamliner/orders",
        line: i + 1,
        problems: [
          "This looks like it might be a secret. You should probably store this in AWS Secrets Manager.",
          problem,
        ],
        title: "Possible Secret?",
      });
    });
  });

  it("ignores values that are probably not secrets", async () => {
    const json = await (
      await fs.readFile(path.join(fixtures, "not-a-secret1"), "utf-8")
    ).split("\n");

    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export CATS=pants",
        "export PANTS='https://github.com/glg-public/gds-cc-screamer/issues'",
        'export SHIRT="https://github.com/glg-public/gds-cc-screamer/issues "',
        "export SANDWICH=mustard",
        "export CHICKEN=$(($SESSION_ROLE_GLG_USER | $SESSION_ROLE_GLG_CLIENT))",
        "export GDS_FQDN='screamer-test.glgresearch.com'",
        "dockerdeploy github/glg/echo/gds:latest",
        "export A='somecrap'",
        'export AWS_INFRASTRUCTURE_REPO="git@github.com:glg/aws-infrastructure.git"',
        "export REDIS_EXPERT_CACHE_URI='redis://fkfkf-sdfasdf-cache.jtxypa.0001.use1.cache.amazonaws.com'",
        "export SUCCESS_THRESHOLD=0.85",
        "export REPORT_GP_SYNC_ERROR_RECIPIENTS='name1@domain.com,name2@domain.com,name3@domain.com,name4@domain.com'",
        'export EPI_TEMPLATE="/zendesk-project-scheduling/getUnfinalizedZoomScheduledCalls.sql"',
        "export PRIVATE_SECRET_NAMESPACES='devopsonly:DevOps|dbadmin:DevOps,DRE|/^production/EPISTREAM_CONNECTION_/:DRE,DevOps'",
        "export REDIRECT_MATCHERS='*=>https://session.glgresearch.com/auth0-cm/logout'",
        'export JOBS_STATUS_FILE="job_statuses.ini"',
        "export GRANT_DEV_MODE_DEV='sbazli, patelkr, cmcculloch, mastover, twise, dhunt'",
        "export GRANT_CREATE_MODE_OTHERS='ltran, agiurea, jsmall, aagrawal1, akapoor, ychopra, poorva.verma, mmalik, jvarghese, asis.chadha, smondal, arathore, rpahadia, vkrishna, asheorain'",
        ...json,
        "export LANG=en_US.UTF-8",
      ],
    };

    const results = await potentialSecrets(deployment);

    expect(results.length).to.equal(0);
  });

  it("ignores variables that are configured in .ccscreamer.json", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: ["export CATS='RPp{2wTzvG8j4^9Du^r~_e%W'"],
    };

    const config = {
      streamliner: {
        potentialSecrets: {
          exclusions: ["CATS"],
        },
      },
    };

    const inputs = { config };

    const results = await potentialSecrets(deployment, {}, inputs);

    expect(results.length).to.equal(0);
  });
});
