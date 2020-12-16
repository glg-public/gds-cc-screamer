const { expect } = require("chai");
const jwtAccessFlags = require("../checks/jwt-access-flags");

describe("Valid bitwise operations in JWT_ACCESS_FLAGS", () => {
  it("allows orders with no JWT_ACCESS_FLAGS declaration", async () => {
    const deployment = {
      ordersPath: "streamliner/orders",
      ordersContents: [],
    };

    const results = await jwtAccessFlags(deployment);
    expect(results.length).to.equal(0);
  });

  it("allows orders where JWT_ACCESS_FLAGS uses a | to combine roles", async () => {
    const deployment = {
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER | $JWT_ROLE_GLG_CLIENT))",
      ],
    };

    const results = await jwtAccessFlags(deployment);
    expect(results.length).to.equal(0);
  });

  it("rejects orders where JWT_ACCESS_FLAGS uses a + to combine roles", async () => {
    const deployment = {
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER + $JWT_ROLE_GLG_CLIENT))",
      ],
    };

    const results = await jwtAccessFlags(deployment);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("failure");
    expect(results[0].problems[0]).to.equal(
      `Use a \`|\` instead \n\`\`\`suggestion
export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER | $JWT_ROLE_GLG_CLIENT))
\`\`\``
    );
  });
});
