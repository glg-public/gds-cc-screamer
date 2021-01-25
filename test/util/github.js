const { expect } = require("chai");
const {
  suggestBugReport,
  getNewIssueLink,
  codeBlock,
  getOwnerRepoBranch,
} = require("../../util");

describe("suggestBugReport", () => {
  it("creates an issue comment that contains a link to open an issue on this repo", async () => {
    let commentPayload;
    const moctokit = {
      issues: {
        createComment: (input) => {
          commentPayload = input;
        },
      },
    };
    const error = new Error("Test");
    await suggestBugReport(moctokit, error, "Test Error", {
      owner: "org",
      repo: "repo",
      pull_number: 42,
    });

    const errorText = codeBlock(`${error.message}\n\n${error.stack}`);
    const issueLink = getNewIssueLink({
      linkText: "Create an issue",
      owner: "glg-public",
      repo: "gds-cc-screamer",
      title: "Test Error",
      body: errorText,
    });
    const expectedBody = `## An error was encountered. Please submit a bug report\n${errorText}\n\n${issueLink}\n`;

    expect(commentPayload).to.deep.equal({
      owner: "org",
      repo: "repo",
      issue_number: 42,
      body: expectedBody,
    });
  });
});

describe("getOwnerRepoBranch", () => {
  const pr = require("../fixtures/pull-request.json");
  it("extracts the owner, repo, and branch from the pull request context", () => {
    const context = { payload: { pull_request: pr }};
    let { owner, repo, branch } = getOwnerRepoBranch(context);
    expect(owner).to.equal("octocat");
    expect(repo).to.equal("Hello-World");
    expect(branch).to.equal("new-topic");
  })
})