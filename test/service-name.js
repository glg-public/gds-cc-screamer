const { expect } = require('chai');
const serviceNameCheck = require('../checks/service-name');

describe('Service Name Check', () => {
  it('works with a valid service name', async () => {
    const serviceName = 'streamliner'
    const orders = {
      path: `${serviceName}/orders`,
      contents: []
    };

    const results = await serviceNameCheck(orders);

    expect(results[0].problems.length).to.equal(0);
  })

  it('rejects service names longer than 28 characters', async () => {
    const serviceName = 'thisservicenameismuchtoolongwayovertwentyeightcharacters'
    const orders = {
      path: `${serviceName}/orders`,
      contents: []
    };

    const results = await serviceNameCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(`**${serviceName}** - Name of service cannot exceed 28 characters.`)
  });

  it('rejects service names with invalid characters', async () => {
    const serviceName = 'ThisServiceName_is_invalid'
    const orders = {
      path: `${serviceName}/orders`,
      contents: []
    };

    const results = await serviceNameCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(`**${serviceName}** - Service name must only contain lowercase alphanumeric characters and hyphens.`)
  });

  it('rejects service names that contain --', async () => {
    const serviceName = 'too--many--hyphens'
    const orders = {
      path: `${serviceName}/orders`,
      contents: []
    };

    const results = await serviceNameCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(`**${serviceName}** - Service name cannot include \`--\`.`)
  });
});