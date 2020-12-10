const { expect } = require('chai');
const policyJsonIsValid = require('../checks/policy-json-valid');
const { suggest } = require('../util');

describe.only('policy.json is valid', () => {
  it('skips if there is no policy.json', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: []
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(0);
  });

  it('accepts valid policy.json', async () => {
    const policyJson = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(0);
  });

  it('rejects policy.json that is not valid JSON', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: 'not valid json'
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "policy.json is not valid JSON",
      path: orders.policyPath,
      problems: [`An error was encountered while trying to JSON parse ${orders.policyPath}`],
      line: 0,
      level: 'failure'
    });
  });

  it('rejects policy.json that is not an Object', async () => {
    const policyJson = JSON.stringify([{
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }], null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: `Invalid policy.json`,
      path: orders.policyPath,
      problems: ["policy.json must be a valid AWS IAM Policy"],
      line: 1,
      level: 'failure'
    });
  });

  it('rejects policy.json with capitalization errors', async () => {
    const policyJson = JSON.stringify({
      version: '2012-10-17',
      statement: [{
        effect: 'Allow',
        action: 'resource:action',
        resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(5);

    const [ version, statement, effect, action, resource ] = results;

    expect(version).to.deep.equal({
      title: 'Statement must be capitalized',
      path: orders.policyPath,
      problems: [suggest('Capitalize this key', '  "Version": "2012-10-17",')],
      line: 2,
      level: 'failure'
    });

    expect(statement).to.deep.equal({
      title: 'Statement must be capitalized',
      path: orders.policyPath,
      problems: [suggest('Capitalize this key', '  "Statement": [')],
      line: 3,
      level: 'failure'
    });

    expect(effect).to.deep.equal({
      title: 'Statement must be capitalized',
      path: orders.policyPath,
      problems: [suggest('Capitalize this key', '      "Effect": "Allow",')],
      line: 5,
      level: 'failure'
    });

    expect(action).to.deep.equal({
      title: 'Statement must be capitalized',
      path: orders.policyPath,
      problems: [suggest('Capitalize this key', '      "Action": "resource:action",')],
      line: 6,
      level: 'failure'
    });

    expect(resource).to.deep.equal({
      title: 'Statement must be capitalized',
      path: orders.policyPath,
      problems: [suggest('Capitalize this key', '      "Resource": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret"')],
      line: 7,
      level: 'failure'
    });
  });

  it('rejects policy.json that is missing Version', async () => {
    const policyJson = JSON.stringify({
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Policy must have a "Version" field',
      path: orders.policyPath,
      problems: ['"Version" is a required field.'],
      line: 0,
      level: 'failure'
    });
  });

  it('rejects policy.json with an invalid version', async () => {
    const policyJson = JSON.stringify({
      Version: '2.6',
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid Version',
      path: orders.policyPath,
      problems: ['Version must be one of: 2008-10-17, 2012-10-17'],
      line: 2,
      level: 'failure'
    });
  });

  it('rejects policy.json that is missing a Statement block', async () => {
    const policyJson = JSON.stringify({
      Version: '2012-10-17',
    }, null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Policy must have a "Statement" block.',
      path: orders.policyPath,
      problems: ['"Statement" is a required field'],
      line: 0,
      level: 'failure'
    });
  });

  it('rejects policy.json where any statement block is missing required fields', async () => {
    const policyJson = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }, {
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Statement is missing required fields.',
      path: 'streamliner/policy.json',
      problems: [
        'All policy statements must include an "Effect" field. Must be "Allow" or "Deny"'
      ],
      level: 'failure',
      line: { start: 9, end: 12 }
    });
  });

  it('rejects policy.json where any statement block has an invalid Effect', async () => {
    const policyJson = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }, {
        Effect: 'allow', // This needs to be capitalized
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2);
    const orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    const results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Effect"',
      path: 'streamliner/policy.json',
      problems: [ '"Effect" must be one of: Allow, Deny' ],
      line: 10,
      level: 'failure'
    });
  });

  it('rejects policy.json where any statement block has an invalid Action', async () => {
    let policyJson = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'resource:action',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }, {
        Effect: 'Allow',
        Action: 'wrong',
        Resource: 'arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret'
      }]
    }, null, 2);
    let orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    let results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Action"',
      path: 'streamliner/policy.json',
      problems: [ '"Action" must be either a valid [Action String](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), or an array of valid action strings.' ],
      line: 11,
      level: 'failure'
    });

    policyJson = JSON.stringify({
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
    }, null, 2);
    console.log(policyJson);

    orders = {
      path: 'streamliner/orders',
      contents: [],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    };

    results = await policyJsonIsValid(orders);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: 'Invalid value for "Action"',
      path: 'streamliner/policy.json',
      problems: [ '"Action" must be either a valid [Action String](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), or an array of valid action strings.' ],
      line: 13,
      level: 'failure'
    });
  });

  it('rejects policy.json where any statement block contains an invalid Resource');
});