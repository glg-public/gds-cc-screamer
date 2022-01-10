const { expect } = require("chai");
const validSubstitutionCheck = require("../checks/valid-bash-substitution");

describe("Valid Bash Substitution Checker", async () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner"
    };

    const results = await validSubstitutionCheck(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts valid bash substitutions", async () => {
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        'export SOME_VAR="first-${SOME_OTHER_VALUE}-and-more-text"',
        'export SOME_VAR="first-$SOME_OTHER_VALUE-and-more-text"',
      ],
    };

    let results = await validSubstitutionCheck(deployment);

    expect(results.length).to.equal(0);
  });

  it("ignores CMD bash subsitutions", async () => {
    const result = await validSubstitutionCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export CMD=\'["bash", "-c", "source /catpants; echo $CAT + $PANTS" = glorious"]\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("ignores ENTRYPOINT bash subsitutions", async () => {
    const result = await validSubstitutionCheck({
      serviceName: "catpants",
      ordersPath: "catpants/orders",
      ordersContents: [
        'export ENTRYPOINT=\'["bash", "-c", "source /catpants; echo $CAT + $PANTS" = glorious"]\''
      ],
    });

    expect(result).to.have.lengthOf(0);
  });

  it("rejects bash subsitutions contained in single quotes", async () => {
    let deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOME_VAR='first-${SOME_OTHER_VALUE}-and-more-text'",
        "export SOME_VAR='first-$SOME_OTHER_VALUE-and-more-text'",
      ],
    };

    let results = await validSubstitutionCheck(deployment);

    expect(results.length).to.equal(2);
    expect(results[0].problems[0]).to.equal(
      `You must use double quotes for bash subsitutions.\n\`\`\`suggestion
export SOME_VAR="first-\$\{SOME_OTHER_VALUE\}-and-more-text"
\`\`\``
    );

    expect(results[1].problems[0]).to.equal(
      `You must use double quotes for bash subsitutions.\n\`\`\`suggestion
export SOME_VAR="first-$SOME_OTHER_VALUE-and-more-text"
\`\`\``
    );
  });
});
