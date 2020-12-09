const { expect } = require('chai');
const { getLinesForJSON } = require('../util');

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

  it('works for objects that contain arrays', () => {
    const policyLines = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }, {
        Effect: 'Allow',
        Action: [
          'resource:*',
          'wrong'
        ],
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2).split('\n');

    const jsonObj = {
      Effect: 'Allow',
      Action: [
        'resource:*',
        'wrong'
      ],
      Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
    };

    const lines = getLinesForJSON(policyLines, jsonObj);
    expect(lines.start).to.equal(9);
    expect(lines.end).to.equal(16)
  });
});