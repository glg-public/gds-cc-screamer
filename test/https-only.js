const { expect } = require("chai");
const httpsOnly = require("../checks/https-only");

describe("HTTPS Only Check", () => {
  it("rejects exported insecure glg domains", async () => {
    const deployment = {
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SEARCH=http://search.glgresearch.com/mosaic",
        'export SOMETHING="http://glg.it"',
        "export MORE='http://services.glgresearch.com/streamliner'",
      ],
    };

    const results = await httpsOnly(deployment);

    // expect(results.length).to.equal(3);

    expect(results[0].problems[0]).to.equal(
      `Use HTTPS for all requests to GLG domains\n\`\`\`suggestion
export SEARCH=https://search.glgresearch.com/mosaic
\`\`\``
    );

    expect(results[1].problems[0]).to.equal(
      `Use HTTPS for all requests to GLG domains\n\`\`\`suggestion
export SOMETHING="https://glg.it"
\`\`\``
    );

    expect(results[2].problems[0]).to.equal(
      `Use HTTPS for all requests to GLG domains\n\`\`\`suggestion
export MORE='https://services.glgresearch.com/streamliner'
\`\`\``
    );
  });

  it("accepts secure glg domains", async () => {
    const deployment = {
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SEARCH=https://search.glgresearch.com/mosaic",
        'export SOMETHING="https://glg.it"',
        "export MORE='https://services.glgresearch.com/streamliner'",
      ],
    };

    const results = await httpsOnly(deployment);

    expect(results.length).to.equal(0);
  });
});
