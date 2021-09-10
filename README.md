![Tests Passing](https://github.com/glg-public/gds-cc-screamer/workflows/Test%20Suite/badge.svg)

![Screamy the GLGoat](./screamer.png)

# ClusterConfig Screamer for GLG Deployment System
This is a github action for validating PRs to GDS Cluster Configs. It evaluates `orders`, `secrets.json`, and `policy.json` for known bugs, and comments on the PR with information and suggestions.

## Why are node_modules checked in?

Github actions run directly from the repository without a build step, so no opportunity to do `npm install` at runtime.

## Why review comments and not checks api?

Review comments allow you to use github's "suggestion" comments, which allow the PR author to click-to-commit the fix.

## Example Usage:

```yml
name: CC Screamer
on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  cc-screamer:
    name: CC Screamer
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: glg-public/gds-cc-screamer@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Checks

### serviceName
### deploymentLine
### healthcheck
### validBashSubsitution
### httpsOnly
### noDuplicateExports
### securityMode
### noSourcing
### accessFlags
### noSpacesInExports
### noDebugInProd
### secretsJsonValid
### secretsInOrders
### noCarriageReturn
### noAWSSecrets
### noOutOfScopeVars
### useCNAME
### noReservedVars
### maxServicesPerCluster
### validateCron
### fqdnRequired
### validTemplatesJson
### potentialSecrets
### secretsExist
### ecsScheduledTaskCount
### jobsOnlyOnJobs
### doubleQuotes
### policyJsonValid
### restrictedBuckets
### validBetas

## Adding Checks

- Create a new file in `./checks/`. It should export an `async function` that accepts a `Deployment` object and returns an array of `Result` objects. You can start by copying the template check in `./checks/template.js`.
- Add your new check to the export array in `./checks/index.js`, following the established pattern.
- Provide test coverage for your check in `./test/`. Your test file should share a name with the file it is testing. i.e. `./checks/service-name.js` should have an accompanying `./test/service-name.js`. This project currently has >90% test coverage, and you should strive to keep it in that range.
- There are JSDoc type definitions in `./typedefs.js` that facilitate working with some of complex objects you get from GitHub.
- There are some helpful utilities in `./util`.

## Who's the goat?

That's Screamy, the GLGoat.
