function getLinesForJSON(fileLines, jsonObj) {
  let start = 0;
  let end = 0;

  // Convert the object into a regex
  const regex = new RegExp(
    JSON.stringify(jsonObj)
      .replace(/\*/g, "\\*")
      .replace(/{/g, "{\\s*")
      .replace(/:"/g, ':\\s*"')
      .replace(/",/g, '"\\s*,\\s*')
      .replace(/}/g, "\\s*}")
      .replace(/\[/g, "\\s*\\[\\s*")
      .replace(/\],?/g, "\\s*\\],?\\s*")
  );

  for (let i = 0; i < fileLines.length; i++) {
    let text = fileLines[i];

    if (text.trim() === "[") {
      continue;
    }

    start = i + 1;

    if (regex.test(text)) {
      end = start;
      break;
    }

    // If we've reached the end of an object, we start over at the next line
    if (/},*/.test(text)) {
      continue;
    }

    for (let j = i + 1; j < fileLines.length; j++) {
      text += `\n${fileLines[j]}`;
      if (regex.test(text)) {
        end = j + 1;
        return { start, end };
      }

      // If we've reached the end of an object, we start over at the next line
      if (/},*/.test(text)) {
        break;
      }
    }
  }

  return { start, end };
}

function suggest(title, suggestion) {
  return `${title}\n\`\`\`suggestion
${suggestion}
\`\`\``;
}

function getLineNumber(fileLines, regex) {
  for (let i = 0; i < fileLines.length; i++) {
    if (regex.test(fileLines[i])) {
      return i + 1;
    }
  }
}

function getLineWithinObject(fileLines, jsonObj, regex) {
  const blockLineNums = getLinesForJSON(fileLines, jsonObj);
  let line;
  if (blockLineNums.start === blockLineNums.end) {
    line = blockLineNums.start;
  } else {
    const blockLines = fileLines.slice(
      blockLineNums.start - 1,
      blockLineNums.end
    );
    line = getLineNumber(blockLines, regex) + blockLineNums.start - 1;
  }

  return line;
}

function getFileLink({ owner, repo, branch, filename, value, type = 'new' }) {
  return `https://github.com/${owner}/${repo}/${type}/${branch}?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(value)}`;
}

function getOwnerRepoBranch(context) {
  const pr = context.payload.pull_request;
  const owner = pr.head.repo.owner.login;
  const repo = pr.base.repo.name;
  const branch = pr.head.ref;

  return { owner, repo, branch };
}

const jobdeploy = new RegExp(
  "^jobdeploy (?<source>\\w+)/(?<org>[\\w-]+)/(?<repo>.+?)/(?<branch>.+?):(?<tag>\\w+)"
);

function isAJob(fileLines) {
  const isJobDeploy =
    fileLines.filter((line) => jobdeploy.test(line)).length > 0;
  const isUnpublished = 
    fileLines.filter((line) => line === 'unpublished').length > 0;

    return isJobDeploy || isUnpublished;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

module.exports = {
  getLinesForJSON,
  suggest,
  getLineNumber,
  getLineWithinObject,
  getFileLink,
  getOwnerRepoBranch,
  isAJob,
  escapeRegExp,
};

