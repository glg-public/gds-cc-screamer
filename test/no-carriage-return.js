const { expect } = require('chai');
const noCarriageReturn = require('../checks/no-carriage-return');
const { suggest } = require('../util');

describe('No Carriage Return', () => {
  it('accepts a file with no carriage returns', async () => {
    const deployment = {
      ordersPath: 'streamliner/orders',
      ordersContents: [
        'export VAR=value',
        '# A comment',
        'export VARZ=valuez'
      ]
    }

    const results = await noCarriageReturn(deployment);
    expect(results.length).to.equal(0);
  });

  it('suggests deleting carriage return characters from orders', async () => {
    const deployment = {
      ordersPath: 'streamliner/orders',
      ordersContents: [
        'export VAR=value\r',
        '# A comment\r',
        'export VARZ=valuez\r'
      ]
    }

    const results = await noCarriageReturn(deployment);
    expect(results.length).to.equal(3);

    results.forEach((result, i) => {
      expect(result).to.deep.equal({
        title: 'No Carriage Return Characters',
        problems: [
          'You must use Unix-type newlines (`\\n`). Windows-type newlines (`\\r\\n`) are not permitted.',
          suggest('Delete the carriage return character', deployment.ordersContents[i].replace(/\r/g, ''))
        ],
        line: i + 1,
        level: 'failure',
        path: deployment.ordersPath
      });
    });
  });

  it('suggests deleting carriage return characters from secrets.json', async () => {
    const secretsJson = `[\r
      {\r
        "name": "JSON_SECRET",\r
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:example::"\r
      },\r
      {\r
        "name": "OTHER_VALUE",\r
        "valueFrom": "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret:newkey::"\r
      }\r
    ]`;

    const deployment = {
      ordersPath: 'streamliner/orders',
      ordersContents: [
        'export VAR=value',
        '# A comment',
        'export VARZ=valuez'
      ],
      secretsPath: 'streamliner/secrets.json',
      secretsContents: secretsJson.split('\n')
    }

    const results = await noCarriageReturn(deployment);
    expect(results.length).to.equal(9);

    // Every line in secrets.json except the last one will generate a failure result
    results.forEach((result, i) => {
      expect(result).to.deep.equal({
        title: 'No Carriage Return Characters',
        problems: [
          'You must use Unix-type newlines (`\\n`). Windows-type newlines (`\\r\\n`) are not permitted.',
          suggest('Delete the carriage return character', deployment.secretsContents[i].replace(/\r/g, ''))
        ],
        line: i + 1,
        level: 'failure',
        path: deployment.secretsPath
      });
    });
  });

  it('suggests deleting carriage return characters from policy.json', async () => {
    const policyJson = JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "ecr:GetAuthorizationToken",
              "ecr:BatchCheckLayerAvailability",
              "ecr:GetDownloadUrlForLayer",
              "ecr:BatchGetImage",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "secretsmanager:GetSecretValue",
            ],
            Resource:
              "arn:aws:secretsmanager:us-east-1:868468680417:secret:dev/json_secret",
          },
        ],
      },
      null,
      2
    ).replace(/\n/g, '\r\n');

    const deployment = {
      ordersPath: 'streamliner/orders',
      ordersContents: [
        'export VAR=value',
        '# A comment',
        'export VARZ=valuez'
      ],
      policyPath: 'streamliner/policy.json',
      policyContents: policyJson.split('\n')
    }

    const results = await noCarriageReturn(deployment);
    expect(results.length).to.equal(17);

    // Every line in policy.json except the last one will generate a failure result
    results.forEach((result, i) => {
      expect(result).to.deep.equal({
        title: 'No Carriage Return Characters',
        problems: [
          'You must use Unix-type newlines (`\\n`). Windows-type newlines (`\\r\\n`) are not permitted.',
          suggest('Delete the carriage return character', deployment.policyContents[i].replace(/\r/g, ''))
        ],
        line: i + 1,
        level: 'failure',
        path: deployment.policyPath
      });
    });
  });
})