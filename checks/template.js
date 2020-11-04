/**
 * Accepts an orders object, and does some kind of check
 * @param {{path: string, contents: Array<string>}} orders 
 */
async function templateCheck(orders) {

  return [
    {
      title: 'Failing Check',
      problems: [
        'first problem',
        'second problem'
      ],
      line: 4,
      fail: true
    }
  ]
}

module.exports = templateCheck;