const { expect } = require('chai');
const deploymentLineCheck = require('../checks/deployment-line');

describe('Deployment Line Check', () => {
  it('rejects an improperly formatted dockerdeploy line', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
        'dockerdeploy git@github:glg/streamliner.git:latest'
      ]
    }

    const results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('Incorrect Formatting: must be `dockerdeploy github/<org>/<repo>/<branch>:<tag>`')
  });

  it('rejects an improperly formatted autodeploy line', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
        'autodeploy git@github/glg/streamliner.git#main'
      ]
    }

    const results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('Incorrect Formatting: must be `autodeploy git@github.com:<org>/<repo>[.git]:<branch>`');
  });

  it('requires either a dockerdeploy or an autodeploy line', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
        'export HEALTHCHECK="/diagnostic"'
      ]
    }

    const results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal(`**${orders.path}** - Missing deployment. Must include either an \`autodeploy\` line or a \`dockerdeploy\` line.`);
  });

  it('rejects repository names with invalid characters', async () => {
    // works with autodeploy
    let orders = {
      path: 'streamliner/orders',
      contents: [
        'autodeploy git@github.com:glg/PriceService.git#main'
      ]
    }

    let results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('**PriceService** - Repository name must be only lowercase alphanumeric characters and hyphens.');

    // works with dockerdeploy
    orders = {
      path: 'streamliner/orders',
      contents: [
        'dockerdeploy github/glg/PriceService/main:latest'
      ]
    }

    results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('**PriceService** - Repository name must be only lowercase alphanumeric characters and hyphens.');
  });

  it('rejects branch names with invalid characters', async () => {
    // works with autodeploy
    let orders = {
      path: 'streamliner/orders',
      contents: [
        'autodeploy git@github.com:glg/price-service.git#Wrong_Branch!'
      ]
    }

    let results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens.');

    // works with dockerdeploy
    orders = {
      path: 'streamliner/orders',
      contents: [
        'dockerdeploy github/glg/price-service/Wrong_Branch!:latest'
      ]
    }

    results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('**Wrong_Branch!** - Branch name must be only lowercase alphanumeric characters and hyphens.');
  });

  it('rejects branch names that contain --', async () => {
    // works with autodeploy
    let orders = {
      path: 'streamliner/orders',
      contents: [
        'autodeploy git@github.com:glg/price-service.git#too--many'
      ]
    }

    let results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('**too--many** - Branch name cannot contain `--`');

    // works with dockerdeploy
    orders = {
      path: 'streamliner/orders',
      contents: [
        'dockerdeploy github/glg/price-service/too--many:latest'
      ]
    }

    results = await deploymentLineCheck(orders);

    expect(results[0].problems.length).to.equal(1);
    expect(results[0].problems[0]).to.equal('**too--many** - Branch name cannot contain `--`');
  });
})