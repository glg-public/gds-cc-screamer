const { expect } = require("chai");
const secretsInOrders = require("../checks/secrets-in-orders");
const { getNewFileLink, getOwnerRepoBranch } = require('../util');

const inputs = {
  awsAccount: 12345678,
  secretsPrefix: "cn-north-1/production/",
  awsRegion: "cn-north-1",
  awsPartition: "aws-cn"
};

const context = {
  payload: {
    pull_request: {
      base: {
        repo: {
          name: 'repo'
        }
      },
      head: {
        ref: 'branch',
        repo: {
          owner: {
            login: 'org'
          }
        }
      }
    }
  }
};

describe("Secrets in orders file", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await secretsInOrders(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts an orders file with no use of secrets", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMEVAR=notasecret",
        "dockerdeploy github/glg/streamliner/master:latest",
      ],
    };

    const results = await secretsInOrders(deployment, context, inputs);
    expect(results.length).to.equal(0);
  });

  it("recommends creating a secrets.json if one is not present and there are secrets in the orders", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMEVAR=notasecret",
        "MY_SECRET=$(secrets MY_SECRET)", // unexported
        'export SECRET_KEY=$(fromJson "${MY_SECRET}" myKey)', // uses "${}"
        "export OTHER_SECRET=$(secrets SOMETHING)", // exported, no fromJson
        "export ONE_MORE=$(secrets PANTS)", // exported
        "export MORE_KEY=$(fromJson $ONE_MORE belt)", // uses $
        "dockerdeploy github/glg/streamliner/master:latest",
      ],
    };

    let results = await secretsInOrders(deployment, context, inputs);
    expect(results.length).to.equal(6);

    const { owner, repo, branch } = getOwnerRepoBranch(context);
    const secretsJson = [
      {
        name: "SECRET_KEY",
        valueFrom: `arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}MY_SECRET:myKey::`,
      },
      {
        name: "OTHER_SECRET",
        valueFrom: `arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}SOMETHING:::`,
      },
      {
        name: "MORE_KEY",
        valueFrom: `arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:belt::`,
      },
      {
        name: "ONE_MORE",
        valueFrom: `arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:::`,
      },
    ];
    const secretsFile = JSON.stringify(secretsJson, null, 2);
    expect(results[0]).to.deep.equal({
      title: "Create a secrets.json",
      problems: [
        `Add a new file, \`streamliner/secrets.json\`, that contains the following:\n\`\`\`json\n${secretsFile}\n\`\`\``,
        `[Click to add file](${getNewFileLink({
          owner,
          repo,
          branch,
          filename: 'streamliner/secrets.json',
          value: secretsFile,
        })})`
      ],
      line: 0,
      level: "failure", // fails because dockerdeploy
    });

    expect(results[1]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 2,
      level: "warning",
    });

    expect(results[2]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 3,
      level: "warning",
    });

    expect(results[3]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 4,
      level: "warning",
    });

    expect(results[4]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 5,
      level: "warning",
    });

    expect(results[5]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 6,
      level: "warning",
    });
  });

  it("recommends adding missing secrets to an existing secrets.json", async () => {
    const secretsJson = [
      {
        name: "SECRET_KEY",
        valueFrom: `arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}MY_SECRET:myKey::`,
      },
      {
        name: "OTHER_SECRET",
        valueFrom: `arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}SOMETHING:::`,
      },
    ];
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMEVAR=notasecret",
        "MY_SECRET=$(secrets MY_SECRET)", // unexported
        'export SECRET_KEY=$(fromJson "${MY_SECRET}" myKey)', // uses "${}"
        "export OTHER_SECRET=$(secrets SOMETHING)", // exported, no fromJson
        "export ONE_MORE=$(secrets PANTS)", // exported
        "export MORE_KEY=$(fromJson $ONE_MORE belt)", // uses $
        "dockerdeploy github/glg/streamliner/master:latest",
      ],
      secretsJson,
      secretsJsonContents: JSON.stringify(secretsJson, null, 4).split("\n"),
      secretsJsonPath: "streamliner/secrets.json",
    };

    const results = await secretsInOrders(deployment, context, inputs);
    expect(results.length).to.equal(6);
    const suggestion = `Add the following secrets
\`\`\`suggestion
    },
    {
        "name": "MORE_KEY",
        "valueFrom": "arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:belt::"
    },
    {
        "name": "ONE_MORE",
        "valueFrom": "arn:${inputs.awsPartition}:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:::"
    }
\`\`\``;
    expect(results[0]).to.deep.equal({
      title: "Missing Secrets in secrets.json",
      path: "streamliner/secrets.json",
      problems: [suggestion],
      level: "failure",
      line: 9,
    });

    expect(results[1]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 2,
      level: "warning",
    });

    expect(results[2]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 3,
      level: "warning",
    });

    expect(results[3]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 4,
      level: "warning",
    });

    expect(results[4]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 5,
      level: "warning",
    });

    expect(results[5]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 6,
      level: "warning",
    });

    
  });
});
