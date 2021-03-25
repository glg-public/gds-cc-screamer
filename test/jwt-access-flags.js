const { expect } = require("chai");
const jwtAccessFlags = require("../checks/jwt-access-flags");

describe.only("Access Flags are Valid", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner",
    };

    const results = await jwtAccessFlags(deployment);
    expect(results.length).to.equal(0);
  });

  describe("Valid bitwise operations in JWT_ACCESS_FLAGS", () => {
    it("allows orders with no JWT_ACCESS_FLAGS declaration", async () => {
      const deployment = {
        serviceName: "streamliner",
        ordersPath: "streamliner/orders",
        ordersContents: [],
      };

      const results = await jwtAccessFlags(deployment);
      expect(results.length).to.equal(0);
    });

    it("allows orders where JWT_ACCESS_FLAGS uses a | to combine roles", async () => {
      const deployment = {
        serviceName: "streamliner",
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
        serviceName: "streamliner",
        ordersPath: "streamliner/orders",
        ordersContents: [
          "export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER + $JWT_ROLE_GLG_CLIENT))",
        ],
      };

      const results = await jwtAccessFlags(deployment);
      expect(results.length).to.equal(1);
      expect(results[0].level).to.equal("failure");
      expect(results[0].problems[0]).to.equal(
        `Use a \`|\` instead\n\`\`\`suggestion
export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER | $JWT_ROLE_GLG_CLIENT))
\`\`\``
      );
    });
  });

  describe("Valid bitwise operations in SESSION_ACCESS_FLAGS", () => {
    it("allows orders with no SESSION_ACCESS_FLAGS declaration", async () => {
      const deployment = {
        serviceName: "streamliner",
        ordersPath: "streamliner/orders",
        ordersContents: [],
      };

      const results = await jwtAccessFlags(deployment);
      expect(results.length).to.equal(0);
    });

    it("allows orders where SESSION_ACCESS_FLAGS uses a | to combine roles", async () => {
      const deployment = {
        serviceName: "streamliner",
        ordersPath: "streamliner/orders",
        ordersContents: [
          "export SESSION_ACCESS_FLAGS=$(($SESSION_ROLE_GLG_USER | $SESSION_ROLE_GLG_CLIENT))",
        ],
      };

      const results = await jwtAccessFlags(deployment);
      expect(results.length).to.equal(0);
    });

    it("rejects orders where SESSION_ACCESS_FLAGS uses a + to combine roles", async () => {
      const deployment = {
        serviceName: "streamliner",
        ordersPath: "streamliner/orders",
        ordersContents: [
          "export SESSION_ACCESS_FLAGS=$(($SESSION_ROLE_GLG_USER + $SESSION_ROLE_GLG_CLIENT))",
        ],
      };

      const results = await jwtAccessFlags(deployment);
      expect(results.length).to.equal(1);
      expect(results[0].level).to.equal("failure");
      expect(results[0].problems[0]).to.equal(
        `Use a \`|\` instead\n\`\`\`suggestion
export SESSION_ACCESS_FLAGS=$(($SESSION_ROLE_GLG_USER | $SESSION_ROLE_GLG_CLIENT))
\`\`\``
      );
    });
  });
});
