const { expect } = require('chai');
const healthcheckCheck = require('../checks/healthcheck');

describe('Healthcheck Check', () => {
  it('Requires the presence of a healthcheck');

  it('rejects healthchecks at /');

  it('rejects an empty healthcheck');
})