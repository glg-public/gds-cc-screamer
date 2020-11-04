# gds-cc-screamer
This is a github action for validating PRs to GDS Cluster Configs

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

- Create a new file in `./checks`. It should export an `async function` that accepts an `orders` object like `{path: string, contents: Array<string>}` and returns an array of results like `[{title: string, problems: Array<string>, line: number, fail: boolean}]`
- Add your new check to the export array in `./checks/index.js`, following the established pattern.