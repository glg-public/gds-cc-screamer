const { expect } = require('chai');
const noDebugInProd = require('../checks/no-debug-in-prod');

describe('No Debug In Prod', async () => {
  it('accepts orders file with no known debug flags', async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: 'streamliner/orders',
      ordersContents: [
        'export HEALTHCHECK=/diagnostic'
      ]
    };

    const results = await noDebugInProd(deployment);
    expect(results.length).to.equal(0);
  });

  it('warns about known debug flags', async () => {
    const deployment = {
      serviceName: "streamliner",
      ordersPath: 'streamliner/orders',
      ordersContents: [
        'export ENABLE_DEBUG="true"',
        'export DEBUG=know*',
        "export REACT_APP_LOG_LEVEL='debug'",
        'export ANYTHING_LOG_LEVEL="verbose"',
        'export DEBUG=false' // this one is fine
      ]
    };

    const results = await noDebugInProd(deployment);
    expect(results.length).to.equal(4);

    // It will have warned about the first 4 lines
    for (let i = 0; i < results.length; i++) {
      expect(results[i]).to.deep.equal({
        title: 'Debug In Production',
        path: deployment.ordersPath,
        line: i+1,
        problems: ['Did you mean to leave this configured this way in production?'],
        level: 'warning',
      })
    }
  });
});