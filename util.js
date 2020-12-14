function getLinesForJSON(fileLines, jsonObj) {
  let start = 0;
  let end = 0;

  // Convert the object into a regex
  const regex = RegExp(
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

function getNewFileLink({ owner, repo, branch, filename, value }) {
  return `https://github.com/${owner}/${repo}/new/${branch}?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(value)}`;
}

function getOwnerRepoBranch(context) {
  const pr = context.payload.pull_request;
  const owner = pr.head.repo.owner.login;
  const repo = pr.base.repo.name;
  const branch = pr.head.ref;

  console.log(JSON.stringify(pr, null, 2));

  return { owner, repo, branch };
}

module.exports = {
  getLinesForJSON,
  suggest,
  getLineNumber,
  getLineWithinObject,
  getNewFileLink,
  getOwnerRepoBranch,
};
