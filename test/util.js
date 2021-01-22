const { expect } = require("chai");
const {
  getLinesForJSON,
  detectIndentation,
  camelCaseFileName,
  isAJob,
  getContents,
  suggestBugReport,
  getNewIssueLink,
  codeBlock,
} = require("../util");
const fs = require("fs");
const path = require("path");

describe("getLinesForJSON", () => {
  it("returns a range of lines for multiline JSON objects", () => {
    let fileLines = [
      "[",
      "  {",
      '    "name":"MY_SECRET",',
      '    "valueFrom": "arn"',
      "  }",
      "]",
    ];

    let jsonObj = { name: "MY_SECRET", valueFrom: "arn" };

    let lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(2);
    expect(lines.end).to.equal(5);

    // Works regardless of key order
    fileLines = ["[{", '  "valueFrom": "arn",', '  "name":"MY_SECRET"', "}]"];

    jsonObj = { valueFrom: "arn", name: "MY_SECRET" };
    lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(1);
    expect(lines.end).to.equal(4);
  });

  it("returns the same value for start and end for 1-line JSON objects", () => {
    let fileLines = ['[{"name":"MY_SECRET","valueFrom":"arn"}]'];
    let jsonObj = { name: "MY_SECRET", valueFrom: "arn" };

    let lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(1);
    expect(lines.end).to.equal(1);
  });

  it("works when there are multiple secret defs", () => {
    let fileLines = [
      "[",
      "  {",
      '    "name":"WRONG",',
      '    "valueFrom": "differentarn"',
      "  },",
      "  {",
      '    "name":"MY_SECRET",',
      '    "valueFrom": "arn"',
      "  }",
      "]",
    ];

    let jsonObj = { name: "MY_SECRET", valueFrom: "arn" };
    let lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(6);
    expect(lines.end).to.equal(9);

    fileLines = [
      "[",
      '  {"name":"WRONG"","valueFrom":"arn"},',
      '  {"name":"MY_SECRET","valueFrom":"arn"}',
      "]",
    ];
    jsonObj = { name: "MY_SECRET", valueFrom: "arn" };

    lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(3);
    expect(lines.end).to.equal(3);
  });

  it("works for objects that contain arrays", () => {
    const policyLines = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "resource:action",
            Resource:
              "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret",
          },
          {
            Effect: "Allow",
            Action: ["resource:*", "wrong"],
            Resource:
              "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret",
          },
        ],
      },
      null,
      2
    ).split("\n");

    const jsonObj = {
      Effect: "Allow",
      Action: ["resource:*", "wrong"],
      Resource:
        "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret",
    };

    const lines = getLinesForJSON(policyLines, jsonObj);
    expect(lines.start).to.equal(9);
    expect(lines.end).to.equal(16);
  });
});

describe("detect-indent", () => {
  const spaces1 = fs
    .readFileSync(path.join(__dirname, "fixtures/1space.json"), "utf8")
    .split("\n");
  const spaces2 = fs
    .readFileSync(path.join(__dirname, "fixtures/2space.json"), "utf8")
    .split("\n");
  const spaces4 = fs
    .readFileSync(path.join(__dirname, "fixtures/4space.json"), "utf8")
    .split("\n");
  const tabs1 = fs
    .readFileSync(path.join(__dirname, "fixtures/1tab.json"), "utf8")
    .split("\n");
  it("works with 1 space", () => {
    const result = detectIndentation(spaces1);
    expect(result).to.deep.equal({
      amount: 1,
      type: "spaces",
      indent: " ",
    });
  });

  it("works with 2 spaces", () => {
    const result = detectIndentation(spaces2);
    expect(result).to.deep.equal({
      amount: 2,
      type: "spaces",
      indent: "  ",
    });
  });

  it("works with 4 spaces", () => {
    const result = detectIndentation(spaces4);
    expect(result).to.deep.equal({
      amount: 4,
      type: "spaces",
      indent: "    ",
    });
  });

  it("works with 1 tab", () => {
    const result = detectIndentation(tabs1);
    expect(result).to.deep.equal({
      amount: 1,
      type: "tabs",
      indent: "\t",
    });
  });
});

describe("camelCaseFilename", () => {
  it("works", () => {
    let result = camelCaseFileName("orders");
    expect(result).to.equal("orders");

    result = camelCaseFileName("secrets.json");
    expect(result).to.equal("secretsJson");

    result = camelCaseFileName("policy.json");
    expect(result).to.equal("policyJson");
  });
});

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
    const ordersPath = path.join(serviceName, "orders")
    const ordersContents = fs
      .readFileSync(ordersPath, "utf8")
      .split("\n");

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
      policyJsonContents
    })
  });
});

describe("suggestBugReport", () => {
  it("creates an issue comment that contains a link to open an issue on this repo", async () => {
    let commentPayload;
    const moctokit = { issues: { createComment: (input) => { commentPayload = input } }};
    const error = new Error("Test");
    await suggestBugReport(moctokit, error, "Test Error", {
      owner: "org",
      repo: "repo",
      pull_number: 42
    });
    
    const errorText = codeBlock(`${error.message}\n\n${error.stack}`);
    const issueLink = getNewIssueLink({
      linkText: "Create an issue",
      owner: "glg-public",
      repo: "gds-cc-screamer",
      title: "Test Error",
      body: errorText
    });
    const expectedBody = `## An error was encountered. Please submit a bug report\n${errorText}\n\n${issueLink}\n`;

    expect(commentPayload).to.deep.equal({
      owner: "org",
      repo: "repo",
      issue_number: 42,
      body: expectedBody
    });
  })
});

describe("codeBlock", () => {
  it("wraps text as a markdown codeblock", () => {
    let wrapped = codeBlock("test");
    expect(wrapped).to.equal("```\ntest\n```");

    wrapped  = codeBlock("test", "suggestion");
    expect(wrapped).to.equal("```suggestion\ntest\n```");
  })
});