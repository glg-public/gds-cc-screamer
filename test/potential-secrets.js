const { expect } = require("chai");
const potentialSecrets = require("../checks/potential-secrets");

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

    expect(results.length).to.equal(deployment.ordersContents.length);
    results.forEach((result, i) => {
      expect(result).to.deep.equal({
        level: "warning",
        path: "streamliner/orders",
        line: i + 1,
        problems: [
          "This looks like it might be a secret. You should probably store this in AWS Secrets Manager.",
          "This was flagged because of high entropy in the value. If this is definitely not a secret, disregard.",
        ],
        title: "Possible Secret?",
      });
    });
  });

  it("ignores values that are probably not secrets", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export CATS=pants",
        "export PANTS='https://github.com/glg-public/gds-cc-screamer/issues'",
        "export SANDWICH=mustard",
        "export CHICKEN=$(($SESSION_ROLE_GLG_USER | $SESSION_ROLE_GLG_CLIENT))",
        "export DOG='dockerdeploy github/glg/echo/gds:latest'",
      ],
    };

    const results = await potentialSecrets(deployment);

    expect(results.length).to.equal(0);
  });
});
