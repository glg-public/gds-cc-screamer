const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const {
  isAJob,
  getContents,
  getExportValue,
  compareSecurity,
  getMasks,
  getMaskComponents,
  getSimpleSecret,
  applyConfig,
} = require("../../util/generic");
const roles = require("../fixtures/roles");
const ccConfig = require("../fixtures/jobs-cc1/.ccscreamer.json");

describe("isAJob", () => {
  it("takes file lines, and determines if it is a job deployment", () => {
    let filelines = ["dockerdeploy github/glg/echo/gds:latest"];
    expect(isAJob(filelines)).to.be.false;

    filelines.push("unpublished");
    expect(isAJob(filelines)).to.be.true;

    filelines = ["jobdeploy github/glg/echo/gds:latest"];
    expect(isAJob(filelines)).to.be.true;
  });
});

describe("getContents", () => {
  it("loads all important files from a directory, and returns a deployment object", async () => {
    // Tests run from repo root, so have to specify the path
    const serviceName = path.join("test", "test-service");
    const deployment = await getContents(serviceName, [
      "orders",
      "secrets.json",
      "policy.json",
    ]);
    const ordersPath = path.join(serviceName, "orders");
    const ordersContents = fs.readFileSync(ordersPath, "utf8").split("\n");

    const secretsJsonPath = path.join(serviceName, "secrets.json");
    const secretsJsonContents = fs
      .readFileSync(secretsJsonPath, "utf8")
      .split("\n");

    const policyJsonPath = path.join(serviceName, "policy.json");
    const policyJsonContents = fs
      .readFileSync(policyJsonPath, "utf8")
      .split("\n");

    expect(deployment).to.deep.equal({
      serviceName,
      ordersPath,
      ordersContents,
      secretsJsonPath,
      secretsJsonContents,
      policyJsonPath,
      policyJsonContents,
    });
  });
});

describe("getExportValue", () => {
  it("retrieves the value of an exported bash variable", () => {
    const value = getExportValue("export CAT='pants'", "CAT");
    expect(value).to.equal("pants");
  });

  it("returns null if the variable is not present in the text", () => {
    const value = getExportValue("export CAT='pants'", "DOG");
    expect(value).to.be.null;
  });

  it("returns null if the exported value is empty", () => {
    const value = getExportValue("export CAT=''", "CAT");
    expect(value).to.be.null;
  });
});

describe("compareSecurity", () => {
  it("returns false if no expected permissions are provided", () => {
    const access = compareSecurity({}, { "jwt-role-glg": 1 });
    expect(access).to.be.false;
  });

  it("assumes a jwt- prefix on the epi template side", () => {
    const access = compareSecurity({ "role-glg": 1 }, { "jwt-role-glg": 1 });
    expect(access).to.be.true;
  });

  it("requires the epi side to have AT LEAST enough permissions for the app", () => {
    const access = compareSecurity({ "role-glg": 1 }, { "jwt-role-glg": 5 });
    expect(access).to.be.true;
  });
});

describe("getMasks", () => {
  it("coverts a front-end access object into a mask object", () => {
    const { masks, acceptableRoles } = getMasks(
      {
        "GLG Employees": true,
        "External Applications": true,
        "GLG Know": true,
      },
      roles
    );
    expect(masks).to.deep.equal({
      "role-glg": 17,
      "role-applications": 1,
    });
    expect(acceptableRoles)
      .to.be.an("array")
      .that.includes("GLG Employees", "External Applications", "GLG Know");
  });
});

describe("getMaskComponents", () => {
  it("returns a ClaimSet for each role supported by a given bitmask", () => {
    let components = getMaskComponents(17);
    expect(components).to.deep.equal([1, 16]);

    components = getMaskComponents(21);
    expect(components).to.deep.equal([1, 4, 16]);

    components = getMaskComponents(16);
    expect(components).to.deep.equal([16]);
  });
});

describe("getSimpleSecret", () => {
  it("returns the secret arn without the json key or other bits #1", () => {
    const arn =
      "arn:aws:secretsmanager:us-east-1:111111111111:secret:us-east-1/devopsonly/GDS_INSTANCES_PRIVATE_KEY-JAPhnA";
    const simpleSecret =
      "arn:aws:secretsmanager:us-east-1:111111111111:secret:us-east-1/devopsonly/GDS_INSTANCES_PRIVATE_KEY-JAPhnA";
    expect(getSimpleSecret(arn)).to.equal(simpleSecret);
  });

  it("returns the secret arn without the json key or other bits #2", () => {
    const arn =
      "arn:aws:secretsmanager:us-east-1:111111111111:secret:us-east-1/production/MY_SECRET:someKey::";
    const simpleSecret =
      "arn:aws:secretsmanager:us-east-1:111111111111:secret:us-east-1/production/MY_SECRET-??????";
    expect(getSimpleSecret(arn)).to.equal(simpleSecret);
  });

  it("returns the secret arn without the json key or other bits #3", () => {
    const arn =
      "arn:aws:secretsmanager:us-east-1:111111111111:secret:us-east-1/production/MY_SECRET:::";
    const simpleSecret =
      "arn:aws:secretsmanager:us-east-1:111111111111:secret:us-east-1/production/MY_SECRET-??????";
    expect(getSimpleSecret(arn)).to.equal(simpleSecret);
  });
});

describe("applyConfig", () => {
  it("does nothing if there is no configuration for a service", () => {
    const results = [
      {
        title: "secrets.json is not valid JSON",
        path: "notconfigured/secrets.json",
        problems: [
          "An error was encountered while trying to JSON parse notconfigured/secrets.json",
        ],
        line: 0,
        level: "failure",
      },
    ];

    const configuredResults = applyConfig({
      config: ccConfig,
      serviceName: "notconfigured",
      checkName: "secretsJsonValid",
      results,
    });

    expect(results).to.deep.equal(configuredResults);
  });

  it("does nothing if there is no configuration for a check for a service", () => {
    const results = [
      {
        title: "secrets.json is not valid JSON",
        path: "service1/secrets.json",
        problems: [
          "An error was encountered while trying to JSON parse service1/secrets.json",
        ],
        line: 0,
        level: "failure",
      },
    ];

    const configuredResults = applyConfig({
      config: ccConfig,
      serviceName: "service1",
      checkName: "secretsJsonValid",
      results,
    });

    expect(results).to.deep.equal(configuredResults);
  });

  it("skips a check for a service if configured", () => {
    const results = [
      {
        title: "secrets.json is not valid JSON",
        path: "service1/secrets.json",
        problems: [
          "An error was encountered while trying to JSON parse service1/secrets.json",
        ],
        line: 0,
        level: "failure",
      },
    ];

    const configuredResults = applyConfig({
      config: ccConfig,
      serviceName: "service1",
      checkName: "check-name2",
      results,
    });

    expect(configuredResults).to.deep.equal([]);
  });

  it("enforces a max level for a check for a service if configured", () => {
    const results = [
      {
        title: "secrets.json is not valid JSON",
        path: "service1/secrets.json",
        problems: [
          "An error was encountered while trying to JSON parse service1/secrets.json",
        ],
        line: 0,
        level: "failure",
      },
    ];

    const configuredResults = applyConfig({
      config: ccConfig,
      serviceName: "service1",
      checkName: "check-name1",
      results,
    });

    expect(configuredResults).to.deep.equal([
      {
        title: "secrets.json is not valid JSON",
        path: "service1/secrets.json",
        problems: [
          "An error was encountered while trying to JSON parse service1/secrets.json",
        ],
        line: 0,
        level: "warning",
      },
    ]);
  });
});
