const { expect } = require("chai");
const secretsInOrders = require("../checks/secrets-in-orders");

const inputs = {
  awsAccount: 12345678,
  secretsPrefix: "us-east-1/production/",
  awsRegion: "us-east-1",
};

describe("Secrets in orders file", () => {
  it("accepts an orders file with no use of secrets", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: [
        "export SOMEVAR=notasecret",
        "dockerdeploy github/glg/streamliner/master:latest",
      ],
    };

    const results = await secretsInOrders(orders, {}, inputs);
    expect(results.length).to.equal(0);
  });

  it("recommends creating a secrets.json if one is not present and there are secrets in the orders", async () => {
    const orders = {
      path: "streamliner/orders",
      contents: [
        "export SOMEVAR=notasecret",
        "MY_SECRET=$(secrets MY_SECRET)", // unexported
        'export SECRET_KEY=$(fromJson "${MY_SECRET}" myKey)', // uses "${}"
        "export OTHER_SECRET=$(secrets SOMETHING)", // exported, no fromJson
        "export ONE_MORE=$(secrets PANTS)", // exported
        "export MORE_KEY=$(fromJson $ONE_MORE belt)", // uses $
        "dockerdeploy github/glg/streamliner/master:latest",
      ],
    };

    let results = await secretsInOrders(orders, {}, inputs);
    expect(results.length).to.equal(6);

    expect(results[0]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 2,
      level: "warning",
    });

    expect(results[1]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 3,
      level: "warning",
    });

    expect(results[2]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 4,
      level: "warning",
    });

    expect(results[3]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 5,
      level: "warning",
    });

    expect(results[4]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 6,
      level: "warning",
    });

    expect(results[5]).to.deep.equal({
      title: "Create a secrets.json",
      problems: [
        `Add a new file, streamliner/secrets.json, that contains the following:\n\`\`\`json\n${JSON.stringify(
          [
            {
              name: "SECRET_KEY",
              valueFrom: `arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}MY_SECRET:myKey::`,
            },
            {
              name: "OTHER_SECRET",
              valueFrom: `arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}SOMETHING:::`,
            },
            {
              name: "MORE_KEY",
              valueFrom: `arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:belt::`,
            },
            {
              name: "ONE_MORE",
              valueFrom: `arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:::`,
            },
          ],
          null,
          2
        )}\n\`\`\``,
      ],
      line: 0,
      level: "failure", // fails because dockerdeploy
    });

    orders.contents[6] = "autodeploy git@github.com:glg/streamliner.git#master";
    delete orders.secretsJson;
    results = await secretsInOrders(orders, {}, inputs);
    expect(results.length).to.equal(6); // same number of errors with an autodeploy
    expect(results[5].level).to.equal("warning"); // not a hard failure if they are using legacy autodeploy
  });

  it("recommends adding missing secrets to an existing secrets.json", async () => {
    const secretsJson = [
      {
        name: "SECRET_KEY",
        valueFrom: `arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}MY_SECRET:myKey::`,
      },
      {
        name: "OTHER_SECRET",
        valueFrom: `arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}SOMETHING:::`,
      },
    ];
    const orders = {
      path: "streamliner/orders",
      contents: [
        "export SOMEVAR=notasecret",
        "MY_SECRET=$(secrets MY_SECRET)", // unexported
        'export SECRET_KEY=$(fromJson "${MY_SECRET}" myKey)', // uses "${}"
        "export OTHER_SECRET=$(secrets SOMETHING)", // exported, no fromJson
        "export ONE_MORE=$(secrets PANTS)", // exported
        "export MORE_KEY=$(fromJson $ONE_MORE belt)", // uses $
        "dockerdeploy github/glg/streamliner/master:latest",
      ],
      secretsJson,
      secretsContents: JSON.stringify(secretsJson, null, 2).split("\n"),
      secretsPath: "streamliner/secrets.json",
    };

    const results = await secretsInOrders(orders, {}, inputs);
    expect(results.length).to.equal(6);

    expect(results[0]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 2,
      level: "warning",
    });

    expect(results[1]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 3,
      level: "warning",
    });

    expect(results[2]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 4,
      level: "warning",
    });

    expect(results[3]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **secrets** binary is being deprecated. Please create a secrets.json in this directory instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 5,
      level: "warning",
    });

    expect(results[4]).to.deep.equal({
      title: "Deprecated Utility",
      problems: [
        "The **fromJson** utility is being deprecated. Please create a secrets.json instead.",
        "Remove this line\n```suggestion\n```",
      ],
      line: 6,
      level: "warning",
    });

    const suggestion = `Add the following secrets
\`\`\`suggestion
  }, {
    "name": "MORE_KEY",
    "valueFrom": "arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:belt::"
  },{
    "name": "ONE_MORE",
    "valueFrom": "arn:aws:secretsmanager:${inputs.awsRegion}:${inputs.awsAccount}:secret:${inputs.secretsPrefix}PANTS:::"
  }
\`\`\``;
    expect(results[5]).to.deep.equal({
      title: "Missing Secrets in secrets.json",
      path: "streamliner/secrets.json",
      problems: [suggestion],
      level: "failure",
      line: 9,
    });
  });
});
