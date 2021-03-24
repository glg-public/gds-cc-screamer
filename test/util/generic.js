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
} = require("../../util/generic");

const roles = [
  {
    name: "Recruiting Contractors",
    dn:
      "CN=Recruiting_Contractors,OU=Distribution Groups,OU=glgroup groups,DC=glgroup,DC=com",
    type: "activeDirectory",
    masks: [
      {
        claim: "role-contractors",
        mask: 1,
      },
    ],
    unmasks: [
      {
        claim: "af",
        mask: 33,
      },
      {
        claim: "role-glg",
        mask: 33,
      },
    ],
    description: "Hired contractors who are not GLG employees",
  },
  {
    name: "GLG Know",
    dn:
      "CN=services.glgresearch.com_know,OU=Application Security Groups,OU=Security Groups,OU=glgroup groups,DC=glgroup,DC=com",
    type: "activeDirectory",
    masks: [
      {
        claim: "role-applications",
        mask: 1,
      },
    ],
    description: "The group of people who can access GLG Know",
  },
  {
    name: "Deny All",
    masks: [
      {
        claim: "role-glg",
        mask: 0,
      },
    ],
    legacy: true,
    description: "Formerly GLG_DENY_ALL",
  },
  {
    name: "GLG Employees",
    masks: [
      {
        claim: "role-glg",
        mask: 1,
      },
    ],
    legacy: true,
    description: "Formerly GLG_USER",
  },
  {
    name: "Clients",
    masks: [
      {
        claim: "role-glg",
        mask: 2,
      },
    ],
    legacy: true,
    description: "Formerly GLG_CLIENT",
  },
  {
    name: "Council Members",
    masks: [
      {
        claim: "role-glg",
        mask: 4,
      },
    ],
    legacy: true,
    description: "Formerly GLG_COUNCILMEMBER",
  },
  {
    name: "Survey Respondent",
    masks: [
      {
        claim: "role-glg",
        mask: 8,
      },
    ],
    legacy: true,
    description: "Formerly GLG_SURVEYRESPONDENT",
  },
  {
    name: "External Applications",
    masks: [
      {
        claim: "role-glg",
        mask: 16,
      },
    ],
    legacy: true,
    description: "Formerly GLG_APP",
  },
  {
    name: "External Worker",
    masks: [
      {
        claim: "role-glg",
        mask: 32,
      },
    ],
    legacy: true,
    description: "Formerly GLG_EXTERNAL_WORKER",
  },
  {
    name: "Allow All",
    masks: [
      {
        claim: "role-glg",
        mask: 2147483647,
      },
    ],
    legacy: true,
    description: "Formerly GLG_ALLOW_ALL",
  },
];

const fixturesDir = path.join(process.cwd(), "test", "fixtures");

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
  });
});
