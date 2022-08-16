![Tests Passing](https://github.com/glg-public/gds-cc-screamer/workflows/Test%20Suite/badge.svg)

![Screamy the GLGoat](./screamer.png)

# ClusterConfig Screamer for GLG Deployment System
This is a github action for validating PRs to GDS Cluster Configs. It evaluates `orders`, `secrets.json`, and `policy.json` for known bugs, and comments on the PR with information and suggestions.

- [ClusterConfig Screamer for GLG Deployment System](#clusterconfig-screamer-for-glg-deployment-system)
  - [Why are node_modules checked in?](#why-are-node_modules-checked-in)
  - [Why review comments and not checks api?](#why-review-comments-and-not-checks-api)
  - [Example Usage:](#example-usage)
  - [Configuration](#configuration)
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
    - [noForbiddenCharacters](#noforbiddencharacters)
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
    - [shellcheck](#shellcheck)
    - [validJsonArraysInBash](#validjsonarraysinbash)
    - [entrypointRequiresCmd](#entrypointrequirescmd)
    - [noDuplicateForwardHostHeaders](#noduplicateforwardhostheaders)
    - [jobsShouldUseBulkMail](#jobsshouldusebulkmail)
    - [fqdnLock](#fqdnlock)
    - [chinaForwardHostHeaders](#chinaforwardhostheaders)
  - [Adding Checks](#adding-checks)
    - [Testing locally](#testing-locally)
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

## Configuration

You can add further, more granular configuration through the use of `.ccscreamer.json`. This file lives at the root of a cluster config repository, and provides a mechanism to customize behavior on a per-service and per-check level.

Currently supported overrides are:
- `maxLevel`: Defines the maximum level a specific check can return for a specific service: "success", "notice", "warning", "failure"
- `skip`: Ignore results for this check for this service

The file looks like
```json
{
  "service-name": {
    "checkName": {
      "skip": true
    }
  },
  "service-name2": {
    "checkName": {
      "maxLevel": "warning"
    }
  }
}
```

### Check-Specific Configuration

Some checks may implement configurable features. All checks receive the configuration object via `inputs.config`.

#### potentialSecrets.exclusions
You may exclude specific environment variables in specific checks from being flagged as secrets. Use this feature only when you are confident the value of that environment variable will never be a secret.

```json
{
  "service-name": {
    "potentialSecrets": {
      "exclusions": ["DATABASE_GLGLIVE_DRIVER"]
    }
  }
}
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
  - should look like `github/<org>/<repo>/<?path/><branch>:<tag>`
- `jobdeploy`
  - should look like `github/<org>/<repo>/<?path/><branch>:<tag>`
- `autodeploy`(legacy)
  - should look like `git@github.com:<org>/<repo>[.git]#<branch>`
- repository name should only include alphanumeric characters and hyphens
- repository name should start with a letter
- path is optional
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
- No environment variable can be declared in both orders and secrets.json

### securityMode

- services on internal clusters be `public`
- services on secure clusters may be `jwt`(legacy),`verifiedSession`, or `htpasswd`(rare cases)
- non-jobs must declare a security mode

### noSourcing

- services cannot source their environment from other deployments

### accessFlags

- if security mode is `jwt` or `verifiedSession`, orders must declare access flags
- combining access flags should be done by bitwise-or-ing them together with `|`.
- declared access flags must match existing roles and claims

### noSpacesInExports

- exported variables cannot have whitespace around the `=`

### noDebugInProd

- services should not use debug logging in production

### secretsJsonValid

- secrets.json must be valid JSON
- secrets.json must be an array of objects like `{name: string, valueFrom: string}` (case-sensitive)
- `valueFrom` must be a valid AWS Secret ARN

### secretsInOrders

- services must use `secrets.json`, not legacy `glg/secrets` binary

### noForbiddenCharacters

- Must only use unix-type newlines, not windows-type carriage returns
- Must not use null characters

### noAWSSecrets

- services should not declare aws credentials in their orders, but instead use `policy.json`

### noOutOfScopeVars

- All bash variables references in an orders file must be declared in the same orders file

### useCNAME

- services should use a friendly cname instead of the default cluster dns
- cnames used must be assigned to the cluster

### noReservedVars

- Certain variables may not be declared in orders files
- Certain variables may not be declared in secrets.json

### maxServicesPerCluster

- non-jobs clusters may only contain 100 services

### validateCron

- cron statements must be valid
- cron statements should include a comment
- cron statements are required for jobs

### fqdnRequired

- services must declare their preferred domain name
- preferrred domain name must be associated with the cluster

### validTemplatesJson

- `templates.json` must be valid json
- templates name in `templates.json` must have compatible access flags with the service

### potentialSecrets

- flags values that are perceived to be secrets

### secretsExist

- all secrets in `secrets.json` exist in the aws account where the cluster is deployed

### ecsScheduledTaskCount

- `ECS_SCHEDULED_TASK_COUNT` must be between 1 and 50 inclusive

### jobsOnlyOnJobs

- jobs can only be deployed on jobs clusters

### doubleQuotes

- environment variables shouldn't be multi-quoted, as in `""something""`

### policyJsonValid

- `policy.json` must be a valid IAM policy document
- services should request specific permissions
- services are unlikely to need delete permissions
- policy must provide access to all secrets specified in secrets.json

### restrictedBuckets

- `policy.json` must not provide permissions to restricted s3 buckets

### validBetas

- beta declarations must reference services that exist

### shellcheck

Runs the [shellcheck](https://github.com/koalaman/shellcheck) utility on the orders file to check for valid bash

### validJsonArraysInBash

- CMD, if present, must be a valid stringified JSON Array a bash variable.
- ENTRYPOINT, if present, must be a valid stringified JSON Array a bash variable.

### entrypointRequiresCmd

- If ENTRYPOINT is defined, then CMD must also be defined.

### noDuplicateForwardHostHeaders

- Each FORWARD_HOST_HEADERS value must be unique for a cluster config. Otherwise, AWS will throw errors about the duplicates and possibly leave your load balancer in a broken state.

### jobsShouldUseBulkMail
- jobs should prefer bulkmail-internal to email-internal


### fqdnLock
- if `fqdn_locks` is configured and the deployment references that fqdn, it will be blocked


### chinaForwardHostHeaders

- GDS China is physically hosted in Mainland China, according to China regulations, websites' hosts physically located in Mainland China MUST have an ICP licensed domain to publish the website, so to use any domain related the feature in GDS China, we have to restrict our user to use ICP licensed domain.

## Adding Checks

- Create a new file in `./checks/`. It should export an `async function` that accepts a `Deployment` object and returns an array of `Result` objects. You can start by copying the template check in `./checks/template.js`.
- Add your new check to the export array in `./checks/index.js`, following the established pattern.
- Provide test coverage for your check in `./test/`. Your test file should share a name with the file it is testing. i.e. `./checks/service-name.js` should have an accompanying `./test/service-name.js`. This project currently has >90% test coverage, and you should strive to keep it in that range.
- There are JSDoc type definitions in `./typedefs.js` that facilitate working with some of complex objects you get from GitHub.
- There are some helpful utilities in `./util`.

### Testing locally
This app runs within a GitHub Action environment (ubuntu-20.04). Some of the npm packages (namely shellcheck) will not run in a Mac environment, so a Dockerfile has been created, along with some developer scripts that are stored in the .dev directory.

While working on new tests (that might not involve shellcheck), you can tell mocha to target specific tests with the .only argument - [AKA Exclusive tests](https://mochajs.org/#exclusive-tests).

To get the expected logging that you've setup, you can run the tests with this environment variable to have more useful logging: `LOG_LEVEL=info npm run test`. For tests that you run locally, the default logging level is set in the `./test.env.js` file.

## Who's the goat?

That's Screamy, the GLGoat.
