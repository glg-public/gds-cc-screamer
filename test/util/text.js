const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const {
  getLinesForJSON,
  detectIndentation,
  camelCaseFileName,
  codeBlock,
  getLineWithinObject,
} = require("../../util/text");

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
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
          },
          {
            Effect: "Allow",
            Action: ["resource:*", "wrong"],
            Resource:
              "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
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
        "arn:aws:secretsmanager:us-east-1:111111111111:secret:dev/json_secret",
    };

    const lines = getLinesForJSON(policyLines, jsonObj);
    expect(lines.start).to.equal(9);
    expect(lines.end).to.equal(16);
  });
});

describe("detect-indent", () => {
  const spaces1 = fs
    .readFileSync(path.join(__dirname, "../fixtures/1space.json"), "utf8")
    .split("\n");
  const spaces2 = fs
    .readFileSync(path.join(__dirname, "../fixtures/2space.json"), "utf8")
    .split("\n");
  const spaces4 = fs
    .readFileSync(path.join(__dirname, "../fixtures/4space.json"), "utf8")
    .split("\n");
  const tabs1 = fs
    .readFileSync(path.join(__dirname, "../fixtures/1tab.json"), "utf8")
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

describe("codeBlock", () => {
  it("wraps text as a markdown codeblock", () => {
    let wrapped = codeBlock("test");
    expect(wrapped).to.equal("```\ntest\n```");

    wrapped = codeBlock("test", "suggestion");
    expect(wrapped).to.equal("```suggestion\ntest\n```");
  });
});

describe("getLineWithinObject", () => {
  it("returns a line number for a value within a json object", () => {
    const secretsJson = [
      {
        name: "JWT_SECRET",
        valueFrom: "some secret arn",
      },
    ];
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=allowed",
        'export SOMETHING_ELSE="also allowed"',
      ],
      secretsJsonPath: "streamliner/secrets.json",
      secretsJson,
      secretsJsonContents: JSON.stringify(secretsJson, null, 2).split("\n"),
    };
    const regex = new RegExp(`"name":\\s*"${secretsJson[0].name}"`);
    const lineNumber = getLineWithinObject(
      deployment.secretsJsonContents,
      secretsJson[0],
      regex
    );
    expect(lineNumber).to.equal(3);
  });
});
