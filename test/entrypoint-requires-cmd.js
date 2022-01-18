const { expect } = require("chai");
const entrypointRequiresCmdCheck = require("../checks/entrypoint-requires-cmd");

describe("Valid JSON Arrays in Bash Checker", async () => {
  it("skips if therea is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await entrypointRequiresCmdCheck(deployment);
    expect(results.length).to.equal(0);
  });

  it("ignores variables not named CMD or ENTRYPOINT", async () => {
    const result = await entrypointRequiresCmdCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export NOTCMD=\'["npm", "run", "start\'',
        'export NOTENTRYPOINT=\'["./establish-lock.sh"]\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("accepts CMD alone is valid", async () => {
    const result = await entrypointRequiresCmdCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export CMD=\'["npm", "run", "start"]\'',
        'export NOTENTRYPOINT=\'["./establish-lock.sh"]\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("accepts CMD and ENTRYPOINT together is valid", async () => {
    const result = await entrypointRequiresCmdCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export CMD=\'["npm", "run", "start]\'',
        'export ENTRYPOINT=\'["./establish-lock.sh"]\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("rejects ENTRYPOINT without CMD", async () => {
    const results = await entrypointRequiresCmdCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export ENTRYPOINT=\'["./establish-lock.sh"]\''
      ],
    });

    expect(results.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `Using ENTRYPOINT to override the docker image requires that you also override CMD.\nSee https://docs.docker.com/engine/reference/run/#entrypoint-default-command-to-execute-at-runtime`
    );

  });

});
