const { expect } = require("chai");
const validTemplatesJson = require("../checks/valid-templates-json");

describe.only("Valid templates.json", () => {
  it("Skips if no templates.json");

  it("Skips if no orders");

  it("warns if templates.json is invalid json");

  it("warns if templates.json doesn't have a 'secure' key");

  it("warns if the app is public, but there are secure templates");

  it(
    "warns if security is undefined in the app, but there are secure templates"
  );

  it("warns if it can't fetch roles");

  it("warns if a template can't be found");

  it("warns if there is a security mismatch between deployment and template");
});
