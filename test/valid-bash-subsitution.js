const { expect } = require('chai');
const validSubstitutionCheck = require('../checks/valid-bash-substitution');

describe('Valid Bash Substitution Checker', async () => {
  it('accepts valid bash substitutions', async () => {
    let orders = {
      path: 'streamliner/orders',
      contents: [
        'export SOME_VAR="first-${SOME_OTHER_VALUE}-and-more-text"',
        'export SOME_VAR="first-$SOME_OTHER_VALUE-and-more-text"'
      ]
    };

    let results = await validSubstitutionCheck(orders);

    expect(results.length).to.equal(0);
  });
  it('rejects bash subsitutions contained in single quotes', async () => {
    let orders = {
      path: 'streamliner/orders',
      contents: [
        "export SOME_VAR='first-${SOME_OTHER_VALUE}-and-more-text'",
        "export SOME_VAR='first-$SOME_OTHER_VALUE-and-more-text'"
      ]
    };

    let results = await validSubstitutionCheck(orders);

    expect(results.length).to.equal(2);
    expect(results[0].problems[0]).to.equal(
`You must use double quotes for bash subsitutions.\n\`\`\`suggestion
export SOME_VAR="first-\$\{SOME_OTHER_VALUE\}-and-more-text"
\`\`\``
    )

    expect(results[1].problems[0]).to.equal(
`You must use double quotes for bash subsitutions.\n\`\`\`suggestion
export SOME_VAR="first-$SOME_OTHER_VALUE-and-more-text"
\`\`\``
    )
  })
})