const { expect } = require("chai");
const noSpaces = require("../checks/no-spaces-in-exports");

describe("No Spaces in Exports Check", () => {
  it("allows orders where all exports have proper spacing", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: [
        "export HEALTHCHECK=/diagnostic",
        "export SECURITY_MODE=jwt",
        'export CAT="pants"',
      ],
    };

    const results = await noSpaces(orders);
    expect(results.length).to.equal(0);
  });

  it("rejects orders if they include exports with incorrect spacing", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: [
        "export HEALTHCHECK =/diagnostic",
        "export SECURITY_MODE= jwt",
        'export CAT = "pants"',
      ],
    };

    const results = await noSpaces(orders);
    expect(results.length).to.equal(3);

    expect(results[0].problems[0]).to.equal(
      `Trim out this whitespace\n\`\`\`suggestion
export HEALTHCHECK=/diagnostic
\`\`\``
    );

    expect(results[1].problems[0]).to.equal(
      `Trim out this whitespace\n\`\`\`suggestion
export SECURITY_MODE=jwt
\`\`\``
    );

    expect(results[2].problems[0]).to.equal(
      `Trim out this whitespace\n\`\`\`suggestion
export CAT="pants"
\`\`\``
    );
  });
});
