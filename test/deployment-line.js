const { expect } = require('chai');
const deploymentLineCheck = require('../checks/deployment-line');

describe('Deployment Line Check', () => {
  it('rejects an improperly formatted dockerdeploy line');

  it('rejects an improperly formatted autodeploy line');

  it('requires either a dockerdeploy or an autodeploy line');

  it('rejects repository names with invalid characters');

  it('rejects branch names with invalid characters');

  it('rejects branch names that contain --');
})