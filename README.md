# gds-cc-screamer
This is a github action for validating PRs to GDS Cluster Configs

## Why are node_modules checked in?

Github actions run directly from the repository without a build step, so no opportunity to do `npm install` at runtime.

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

## Adding Checks

- Create a new file in `./checks`. It should export an `async function` that accepts an `orders` object like `{path: string, contents: Array<string>}` and returns an array of results like `[{title: string, problems: Array<string>, line: number, level: string}]`. You can start by copying the template check in `./checks/template.js`.
- Add your new check to the export array in `./checks/index.js`, following the established pattern.
- Provide test coverage for your check in `./test`. Your test file should share a name with the file it is testing. i.e. `./checks/service-name.js` should have an accompanying `./test/service-name.js`.