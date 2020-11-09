const { expect } = require('chai');
const securityMode = require('../checks/security-mode');

describe('Security Mode Check', () => {
  it('allows jwt or verifiedSession for "s" clusters', async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: 'gds.clusterconfig.s01'
            }
          }
        }
      }
    };

    // Bare jwt
    let orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE=jwt'
      ]
    };

    let results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // single quote jwt
    orders = {
      path: 'streamliner/orders',
      contents: [
        "export SECURITY_MODE='jwt'"
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // double quote jwt
    orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE="jwt"'
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // bare verfifiedSession
    orders = {
      path: 'streamliner/orders',
      contents: [
        "export SECURITY_MODE=verifiedSession"
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // single quote verifiedSession
    orders = {
      path: 'streamliner/orders',
      contents: [
        "export SECURITY_MODE='verifiedSession'"
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // double quote verifiedSession
    orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE="verifiedSession"'
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // And this fails as an invalid security mode
    orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE=public'
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal('failure');
    expect(results[0].problems[0]).to.equal('This cluster only supports the following security modes: **jwt, verifiedSession**');
  });

  it('allows public for "i" clusters', async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: 'gds.clusterconfig.i01'
            }
          }
        }
      }
    };

    // Bare public
    let orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE=public'
      ]
    };

    let results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // single quote public
    orders = {
      path: 'streamliner/orders',
      contents: [
        "export SECURITY_MODE='public'"
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // double quote public
    orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE="public"'
      ]
    };

    // And this fails as an invalid security mode
    orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE=jwt'
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal('failure');
    expect(results[0].problems[0]).to.equal('This cluster only supports the following security modes: **public**');
  });

  it('allows public for "p" clusters', async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: 'gds.clusterconfig.p01'
            }
          }
        }
      }
    };

    // Bare public
    let orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE=public'
      ]
    };

    let results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // single quote public
    orders = {
      path: 'streamliner/orders',
      contents: [
        "export SECURITY_MODE='public'"
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(0);

    // double quote public
    orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE="public"'
      ]
    };

    // And this fails as an invalid security mode
    orders = {
      path: 'streamliner/orders',
      contents: [
        'export SECURITY_MODE=jwt'
      ]
    };

    results = await securityMode(orders, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal('failure');
    expect(results[0].problems[0]).to.equal('This cluster only supports the following security modes: **public**');
  });

  it('rejects orders without a SECURITY_MODE', async () => {
    const context = {
      payload: {
        pull_request: {
          base: {
            repo: {
              name: 'gds.clusterconfig.p01'
            }
          }
        }
      }
    };

    // Bare public
    let orders = {
      path: 'streamliner/orders',
      contents: [
      ]
    };

    let results = await securityMode(orders, context);
    expect(results.length).to.equal(1);
    expect(results[0].level).to.equal('failure');
    expect(results[0].problems[0]).to.equal('`SECURITY_MODE` is missing.\n\nIf this is intentional, add `unpublished` to your orders file.');
  });
})