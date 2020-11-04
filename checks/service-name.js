const path = require('path');

const validCharacters = RegExp('^[a-z][a-z0-9\-]*');

async function validateServiceName(file) {
  const serviceName = path.dirname(file.name);

  const problems = [];

  if (serviceName.length > 28) {
    problems.push('Name of service cannot exceed 28 characters.');
  }

  if (!validCharacters.test(serviceName)) {
    problems.push('Service name must only contain lowercase alphanumeric characters and hyphens.');
  }

  if (serviceName.includes('--')) {
    problems.push('Service name cannot include "--".');
  }

  return {
    check: 'Valid Service Name',
    problems
  }
}

module.exports = validateServiceName;