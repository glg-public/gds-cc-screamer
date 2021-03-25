const { expect } = require("chai");
const validTemplatesJson = require("../checks/valid-templates-json");
const roles = require("./fixtures/roles");

describe("Valid templates.json", () => {
  it("Skips if no templates.json", async () => {
    const deployment = {
      serviceName: "streamliner",
    };

    const results = await validTemplatesJson(deployment);

    expect(results.length).to.equal(0);
  });

  it("Skips if no orders", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        {
          secure: ["example/something.sql"],
        },
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
    };

    const results = await validTemplatesJson(deployment);

    expect(results.length).to.equal(0);
  });

  it("warns if templates.json is invalid json", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: "example/something.sql",
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: ["export A=b"],
    };

    const results = await validTemplatesJson(deployment);

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
    expect(results[0].line).to.equal(0);
    expect(results[0].path).to.equal(deployment.templatesJsonPath);
  });

  it("warns if templates.json doesn't have a 'secure' key", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        ["example/something.sql"],
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: ["export A=b"],
    };

    const results = await validTemplatesJson(deployment);

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
    expect(results[0].line).to.equal(1);
    expect(results[0].path).to.equal(deployment.templatesJsonPath);
  });

  it("warns if the app is public, but there are secure templates", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        {
          secure: ["example/something.sql"],
        },
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: ["export SECURITY_MODE=public"],
    };

    const results = await validTemplatesJson(deployment);

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
    expect(results[0].line).to.equal(0);
    expect(results[0].path).to.equal(deployment.templatesJsonPath);
  });

  it("warns if security is undefined in the app, but there are secure templates", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        {
          secure: ["example/something.sql"],
        },
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: [],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "deployinator.glgresearch.com/deployinator",
    };

    const localGet = async (url, opts) => {
      if (/roles/.test(url)) {
        return roles;
      }
    };

    const results = await validTemplatesJson(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
    expect(results[0].line).to.equal(0);
    expect(results[0].path).to.equal(deployment.templatesJsonPath);
  });

  it("skips checks that require auth if no token is present", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        {
          secure: ["example/something.sql"],
        },
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: ["export SECURITY_MODE=verifiedSession"],
    };

    const inputs = {};

    const results = await validTemplatesJson(deployment, undefined, inputs);

    expect(results.length).to.equal(0);
  });

  it("warns if it can't fetch roles", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        {
          secure: ["example/something.sql"],
        },
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: ["export SECURITY_MODE=verifiedSession"],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "deployinator.glgresearch.com/deployinator",
    };

    const localGet = async (url, opts) => {
      if (/roles/.test(url)) {
        throw new Error("No Roles!");
      }
    };

    const results = await validTemplatesJson(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
    expect(results[0].line).to.equal(0);
    expect(results[0].path).to.equal(deployment.templatesJsonPath);
  });

  it("warns if a template can't be found", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        {
          secure: ["example/something.sql"],
        },
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: ["export SECURITY_MODE=verifiedSession"],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "deployinator.glgresearch.com/deployinator",
    };

    const localGet = async (url, opts) => {
      if (/roles/.test(url)) {
        return roles;
      } else if (/\/security\//.test(url)) {
        throw new Error("no template!");
      }
    };

    const results = await validTemplatesJson(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
    expect(results[0].line).to.equal(3);
    expect(results[0].path).to.equal(deployment.templatesJsonPath);
  });

  it("warns if there is a security mismatch between deployment and template", async () => {
    const deployment = {
      serviceName: "streamliner",
      templatesJsonContents: JSON.stringify(
        {
          secure: ["example/something.sql"],
        },
        null,
        2
      ).split("\n"),
      templatesJsonPath: "streamliner/templates.json",
      ordersContents: [
        "export SECURITY_MODE=verifiedSession",
        "export SESSION_ACCESS_FLAGS=role-glg:16",
      ],
    };

    const inputs = {
      deployinatorToken: "token",
      deployinatorURL: "deployinator.glgresearch.com/deployinator",
    };

    const localGet = async (url, opts) => {
      if (/roles/.test(url)) {
        return roles;
      } else if (/\/security\//.test(url)) {
        return { executionMasks: { "jwt-role-glg": 1 } };
      }
    };

    const results = await validTemplatesJson(
      deployment,
      undefined,
      inputs,
      localGet
    );

    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal("warning");
    expect(results[0].line).to.equal(3);
    expect(results[0].path).to.equal(deployment.templatesJsonPath);
  });
});
