const { expect } = require('chai');
const { secretsJsonIsValid, getLinesForJSON } = require('../checks/secrets-json-valid');

describe('getLinesForJSON', () => {
  it('returns a range of lines for multiline JSON objects', () => {
    let fileLines = [
      '[',
      '  {',
      '    "name":"MY_SECRET",',
      '    "valueFrom": "arn"',
      '  }',
      ']'
    ]
 
    let jsonObj = {name: "MY_SECRET", valueFrom: "arn"};

    let lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(2);
    expect(lines.end).to.equal(5);

    // Works regardless of key order
    fileLines = [
      '[{',
      '  "valueFrom": "arn",',
      '  "name":"MY_SECRET"',
      '}]'
    ]

    jsonObj = {valueFrom: "arn", name: "MY_SECRET"};
    lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(1);
    expect(lines.end).to.equal(4);
  });

  it('returns the same value for start and end for 1-line JSON objects', () => {
    let fileLines = ['[{"name":"MY_SECRET","valueFrom":"arn"}]'];
    let jsonObj = {name: "MY_SECRET", valueFrom: "arn"};

    let lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(1);
    expect(lines.end).to.equal(1);
  });

  it('works when there are multiple secret defs', () => {
    let fileLines = [
      '[',
      '  {',
      '    "name":"WRONG",',
      '    "valueFrom": "differentarn"',
      '  },',
      '  {',
      '    "name":"MY_SECRET",',
      '    "valueFrom": "arn"',
      '  }',
      ']'
    ]
 
    let jsonObj = {name: "MY_SECRET", valueFrom: "arn"};
    let lines = getLinesForJSON(fileLines, jsonObj);
    expect(lines.start).to.equal(6);
    expect(lines.end).to.equal(9);

    fileLines = [
      '[',
      '  {"name":"WRONG"","valueFrom":"arn"},',
      '  {"name":"MY_SECRET","valueFrom":"arn"}',
      ']'];
    jsonObj = {name: "MY_SECRET", valueFrom: "arn"};

    lines = getLinesForJSON(fileLines, jsonObj);
    console.log(lines);
    expect(lines.start).to.equal(3);
    expect(lines.end).to.equal(3);
  });
});

describe('secrets.json is valid check', () => {
  it('skips when there is no secrets.json');

  it('accepts valid secrets.json files');

  it('rejects secrets.json that is not an array');

  it('rejects a secrets.json where any secret is not an object');

  it('rejects a secrets.json where any secret is missing a required key');

  it('rejects a secrets.json where any secret has non-required keys');

  it('rejects a secrets.json if the arn is invalid');
})