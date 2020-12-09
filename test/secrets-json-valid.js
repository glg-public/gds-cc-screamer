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
    expect(lines.start).to.equal(3);
    expect(lines.end).to.equal(3);
  });
});

describe('secrets.json is valid check', () => {
  it('skips when there is no secrets.json', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: []
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(0);
  });

  it('accepts valid secrets.json files', async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"
      }
    ]`;

    const orders = {
      path: 'streamliner/orders',
      contents: [],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(0);
  });

  it('rejects secrets.json that is not valid JSON', async () => {
    const secretsJson = 'invalid json';

    const orders = {
      path: 'streamliner/orders',
      contents: [],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "secrets.json is not valid JSON",
      path: orders.secretsPath,
      problems: [`An error was encountered while trying to JSON parse ${orders.secretsPath}`],
      line: 0,
      level: 'failure'
    });
  });

  it('rejects secrets.json that is not an array', async () => {
    const secretsJson = `{
      "JSON_SECRET": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
    }`;

    const orders = {
      path: 'streamliner/orders',
      contents: [],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid secrets.json`,
      path: orders.secretsPath,
      problems: ["secrets.json must be an array of objects like `[{ name, valueFrom }]`"],
      line: 1,
      level: 'failure'
    });
  });

  it('rejects a secrets.json where any secret is not an object', async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"
      },
      ["some array"]
    ]`;

    const orders = {
      path: 'streamliner/orders',
      contents: [],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid secrets.json`,
      path: orders.secretsPath,
      problems: ["secrets.json must be an array of objects like `[{ name, valueFrom }]`"],
      line: 1,
      level: 'failure'
    });
  });

  it('rejects a secrets.json where any secret is missing a required key', async () => {
    const secretsJson = `[
      {
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"
      }
    ]`;

    const orders = {
      path: 'streamliner/orders',
      contents: [],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret Structure",
      path: orders.secretsPath,
      problems: ['Each secret must be an object like { name, valueFrom }'],
      line: {
        start: 2,
        end: 4
      },
      level: 'failure'
    });
  });

  it('rejects a secrets.json where any secret has non-required keys', async () => {
    const secretsJson = `[
      {
        "name": "MY_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::",
        "extraKey": "this shouldn't be here"
      }
    ]`;

    const orders = {
      path: 'streamliner/orders',
      contents: [],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret Structure",
      path: orders.secretsPath,
      problems: ['Each secret must **only** contain the keys "name" and "valueFrom".'],
      line: {
        start: 6,
        end: 10
      },
      level: 'failure'
    });
  });

  it('rejects a secrets.json if the arn is invalid', async () => {
    const secretsJson = `[
      {
        "name": "JSON_SECRET",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"
      },
      {
        "name": "OTHER_VALUE",
        "valueFrom": "dev/json_secret"
      }
    ]`;

    const orders = {
      path: 'streamliner/orders',
      contents: [],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    };

    const results = await secretsJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Invalid Secret: OTHER_VALUE",
      path: orders.secretsPath,
      problems: ['Invalid secret ARN: dev/json_secret'],
      line: {
        start: 6,
        end: 9
      },
      level: 'failure'
    })
  });
})