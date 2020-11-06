const { expect } = require('chai');
const noDupes = require('../checks/no-duplicate-exports');

describe('No Duplicate Exports Check', () => {
  it('allows orders with no duplicate exports', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
        'export THREE=something',
        'export UNIQUE=123',
        'export VARS="quoted string"'
      ]
    };
    
    const results = await noDupes(orders);

    expect(results.length).to.equal(0);
  });

  it('rejects orders that contain duplicate exports', async () => {
    const orders = {
      path: 'streamliner/orders',
      contents: [
        'export DUPED=something',
        'export DUPED=123',
        'export UNIQUE="quoted string"'
      ]
    };

    const results = await noDupes(orders);

    expect(results.length).to.equal(2);

    expect(results[0].problems[0]).to.equal('The variable `DUPED` is exported on multiple lines: **1, 2**')

    expect(results[1].problems[0]).to.equal('The variable `DUPED` is exported on multiple lines: **1, 2**')
  });
})