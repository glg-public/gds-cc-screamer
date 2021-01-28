const {
  codeBlock,
  suggest,
  getLinesForJSON,
  getLineNumber,
  getLineWithinObject,
  escapeRegExp,
  detectIndentation,
  camelCaseFileName,
} = require("./text");

const {
  getAllDeployments,
  leaveComment,
  suggestBugReport,
  lineLink,
  prLink,
  getNewIssueLink,
  getNewFileLink,
  getOwnerRepoBranch,
  clearPreviousRunComments,
} = require("./github");

const {
  isAJob,
  getContents,
  getExportValue,
  httpGet
} = require("./generic");

module.exports = {
  getLinesForJSON,
  suggest,
  getLineNumber,
  getLineWithinObject,
  getNewFileLink,
  getOwnerRepoBranch,
  isAJob,
  escapeRegExp,
  detectIndentation,
  leaveComment,
  suggestBugReport,
  getAllDeployments,
  clearPreviousRunComments,
  getContents,
  camelCaseFileName,
  getExportValue,
  getNewIssueLink,
  codeBlock,
  prLink,
  lineLink,
  httpGet
};
