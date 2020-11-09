const { expect } = require('chai');
const jwtAccessFlags = require('../checks/jwt-access-flags');

describe('Valid bitwise operations in JWT_ACCESS_FLAGS', () => {
  it('allows orders with no JWT_ACCESS_FLAGS declaration', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
      ]
    };

    const results = await jwtAccessFlags(orders);
    expect(results.length).to.equal(0);
  });

  it('allows orders where JWT_ACCESS_FLAGS uses a | to combine roles', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
        'export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER | $JWT_ROLE_GLG_CLIENT))'
      ]
    };

    const results = await jwtAccessFlags(orders);
    expect(results.length).to.equal(0);
  });

  it('rejects orders where JWT_ACCESS_FLAGS uses a + to combine roles', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
        'export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER + $JWT_ROLE_GLG_CLIENT))'
      ]
    };

    const results = await jwtAccessFlags(orders);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal('failure');
    expect(results[0].problems[0]).to.equal(
`Use a \`|\` instead \n\`\`\`suggestion
export JWT_ACCESS_FLAGS=$(($JWT_ROLE_GLG_USER | $JWT_ROLE_GLG_CLIENT))
\`\`\``
    )
  });
})