![Tests Passing](https://github.com/glg-public/gds-cc-screamer/workflows/Test%20Suite/badge.svg)

![Screamy the GLGoat](./screamer.png)

# ClusterConfig Screamer for GLG Deployment System
This is a github action for validating PRs to GDS Cluster Configs. It evaluates `orders`, `secrets.json`, and `policy.json` for known bugs, and comments on the PR with information and suggestions.

- [ClusterConfig Screamer for GLG Deployment System](#clusterconfig-screamer-for-glg-deployment-system)
  - [Why are node_modules checked in?](#why-are-node_modules-checked-in)
  - [Why review comments and not checks api?](#why-review-comments-and-not-checks-api)
  - [Example Usage:](#example-usage)
  - [Checks](#checks)
    - [serviceName](#servicename)
    - [deploymentLine](#deploymentline)
    - [healthcheck](#healthcheck)
    - [validBashSubsitution](#validbashsubsitution)
    - [httpsOnly](#httpsonly)
    - [noDuplicateExports](#noduplicateexports)
    - [securityMode](#securitymode)
    - [noSourcing](#nosourcing)
    - [accessFlags](#accessflags)
    - [noSpacesInExports](#nospacesinexports)
    - [noDebugInProd](#nodebuginprod)
    - [secretsJsonValid](#secretsjsonvalid)
    - [secretsInOrders](#secretsinorders)
    - [noCarriageReturn](#nocarriagereturn)
    - [noAWSSecrets](#noawssecrets)
    - [noOutOfScopeVars](#nooutofscopevars)
    - [useCNAME](#usecname)
    - [noReservedVars](#noreservedvars)
    - [maxServicesPerCluster](#maxservicespercluster)
    - [validateCron](#validatecron)
    - [fqdnRequired](#fqdnrequired)
    - [validTemplatesJson](#validtemplatesjson)
    - [potentialSecrets](#potentialsecrets)
    - [secretsExist](#secretsexist)
    - [ecsScheduledTaskCount](#ecsscheduledtaskcount)
    - [jobsOnlyOnJobs](#jobsonlyonjobs)
    - [doubleQuotes](#doublequotes)
    - [policyJsonValid](#policyjsonvalid)
    - [restrictedBuckets](#restrictedbuckets)
    - [validBetas](#validbetas)
  - [Adding Checks](#adding-checks)
  - [Who's the goat?](#whos-the-goat)

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

- Service name must be <= 28 characters
- Service name must lowercase alphanumeric characters and hyphens
- Service name must start with a letter
- Service name cannot include `--`

### deploymentLine

- orders file must contain a deployment line
- `dockerdeploy`
  - should look like `github/<org>/<repo>/<branch>:<tag>`
- `jobdeploy`
  - should look like `github/<org>/<repo>/<branch>:<tag>`
- `autodeploy`(legacy)
  - should look like `git@github.com:<org>/<repo>[.git]#<branch>`
- repository name should only include alphanumeric characters and hyphens
- repository name should start with a letter
- branch name should only include alphanumeric characters and hyphens
- branch name should start with a letter
- branch name cannot include `--`
- repository must exist
- branch must exist
- docker image and tag must exist (except for `autodeploy`)

### healthcheck

- non-jobs must specify a healthcheck
- healthcheck cannot be `/`

### validBashSubsitution

- must use double-quotes when using bash substitution

### httpsOnly

- All requests to GLG owned domains must be made over https

### noDuplicateExports

- No environment variable can be declared twice in the same orders file

### securityMode

- services on internal clusters be `public`
- services on secure clusters may be `jwt`(legacy),`verifiedSession`, or `htpasswd`(rare cases)
- non-jobs must declare a security mode

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
