const { expect } = require("chai");
const doubleQuotes = require("../checks/double-quotes");

describe("doubleQuotes", () => {
  it("suggests using only `'` if the doublequoted value does not contain bash substitution", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        `export OUTLOOK_API_SERVER='"https://streamliner-internal.glgresearch.com/outlook-api-v2"'`,
      ],
    };

    const results = await doubleQuotes(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Double Quoted Value",
      level: "notice",
      line: 1,
      path: "streamliner/orders",
      problems: [
        "Just use single quotes\n" +
          "```suggestion\n" +
          `export OUTLOOK_API_SERVER='https://streamliner-internal.glgresearch.com/outlook-api-v2'\n` +
          "```",
      ],
    });
  });

  it('suggests using only `"` if the doublequoted value contains bash subsitution', async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        `export OUTLOOK_API_SERVER='"https://\${STARPHLEET_URL}/outlook-api-v2"'`,
      ],
    };

    const results = await doubleQuotes(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Double Quoted Value",
      level: "notice",
      line: 1,
      path: "streamliner/orders",
      problems: [
        "Just use double quotes\n" +
          "```suggestion\n" +
          `export OUTLOOK_API_SERVER="https://\${STARPHLEET_URL}/outlook-api-v2"\n` +
          "```",
      ],
    });
  });
});
