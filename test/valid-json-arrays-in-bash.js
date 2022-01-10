const { expect } = require("chai");
const validJsonArrayInBashCheck = require("../checks/valid-json-arrays-in-bash");

describe("Valid JSON Arrays in Bash Checker", async () => {
  it("skips if therea is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await validJsonArrayInBashCheck(deployment);
    expect(results.length).to.equal(0);
  });

  it("ignores variables not named CMD or ENTRYPOINT", async () => {
    const result = await validJsonArrayInBashCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export NOTCMD=\'["npm", "run", "start\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("accepts valid arrays in CMD bash variables", async () => {
    const result = await validJsonArrayInBashCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export CMD=\'["npm", "run", "start"]\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("rejects invalid JSON in CMD bash variables", async () => {
    const results = await validJsonArrayInBashCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export CMD=\'["npm", "run", "start]\''
      ],
    });

    expect(results.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `The contents of the CMD variable must contain valid JSON.`
    );

  });

  it("rejects invalid JSON array in CMD bash variables", async () => {
    const results = await validJsonArrayInBashCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export CMD=\'"npm start"\''
      ],
    });

    expect(results.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `The contents of the CMD variable must contain a valid JSON Array.\n\`\`\`suggestion
export CMD='["npm","start"]'
\`\`\``
    );

  });

  it("accepts valid arrays in ENTRYPOINT bash variables", async () => {
    const result = await validJsonArrayInBashCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export ENTRYPOINT=\'["./establish-lock.sh"]\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("rejects invalid JSON in ENTRYPOINT bash variables", async () => {
    const results = await validJsonArrayInBashCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export ENTRYPOINT=\'["establish-lock.sh]\''
      ],
    });

    expect(results.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `The contents of the ENTRYPOINT variable must contain valid JSON.`
    );

  });

  it("rejects invalid JSON array in ENTRYPOINT bash variables", async () => {
    const results = await validJsonArrayInBashCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export ENTRYPOINT=\'"./establish-lock.sh"\''
      ],
    });

    expect(results.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(
      `The contents of the ENTRYPOINT variable must contain a valid JSON Array.\n\`\`\`suggestion
export ENTRYPOINT='["./establish-lock.sh"]'
\`\`\``
    );

  });

});
