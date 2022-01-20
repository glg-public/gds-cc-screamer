const { expect } = require("chai");
const noOutOfScopeVars = require("../checks/no-out-of-scope-vars");

describe("No Out Of Scope Variables", () => {
  it("skips if there is no orders file", async () => {
    const deployment = {
      serviceName: "streamliner",
    };

    const results = await noOutOfScopeVars(deployment);
    expect(results.length).to.equal(0);
  });

  it("accepts orders with no undefined variable use.", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=hello",
        'MORE="You had me at $SOMETHING"',
        'echo "${MORE}"',
        "export HTPASSWD='glgtmf:$gtf6$WjuFiDn4$sadfadfsadfasdfsadf/dfgkljasdg8'",
      ],
    };

    const results = await noOutOfScopeVars(deployment);
    expect(results.length).to.equal(0);
  });

  it("should ignore variables in `export CMD`", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=hello",
        'MORE="You had me at $SOMETHING"',
        'echo "${MORE}"',
        `export CMD='["bash", "-c", "source /home/ubuntu/start; $HEADQUARTERS_LOCAL/consultation-outreach-etl-stats-emailer/cadences.sh"]`,
      ],
    };

    expect(await noOutOfScopeVars(deployment)).to.have.lengthOf(0);
  });

  it("should ignore variables in singlequotes in a shell", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export ENVIRONMENT_VERSION=`git log -1 --oneline | awk '{ print $1 }'`",
      ],
    };

    expect(await noOutOfScopeVars(deployment)).to.have.lengthOf(0);
  });

  it("rejects orders that reference undefined variables.", async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: "streamliner/orders",
      ordersContents: [
        "export SOMETHING=hello",
        'MORE="You had me at $SOMETHING"',
        'echo "${MORE}"',
        "export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER | $JWT_ROLE_GLG_CLIENT))",
      ],
    };

    const results = await noOutOfScopeVars(deployment);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "Out of Scope Variable Reference",
      line: 4,
      level: "failure",
      path: deployment.ordersPath,
      problems: [
        "GDS requires that all referenced variables be defined within the `orders` file. `.starphleet` has been deprecated.",
        "**Undefined Variable:** `JWT_ROLE_GLG_USER`",
        "**Undefined Variable:** `JWT_ROLE_GLG_CLIENT`",
      ],
    });
  });
});
