function getLinesForJSON(fileLines, jsonObj) {
  let start = 0;
  let end = 0;

  // Convert the object into a regex
  const regex = RegExp(JSON.stringify(jsonObj)
    .replace(/{/g, '{\\s*')
    .replace(/:"/g, ':\\s*"')
    .replace(/",/g, '"\\s*,\\s*')
    .replace(/}/g, '\\s*}')
  )

  for (let i = 0; i < fileLines.length; i++) {
    let text = fileLines[i];

    if (text.trim() === '[') {
      continue;
    }

    start = i+1;

    if (regex.test(text)) {
      end = start;
      break;
    }

    // If we've reached the end of an object, we start over at the next line
    if (/},*/.test(text)) {
      continue;
    }

    for (let j = i+1; j < fileLines.length; j++) {
      text += `\n${fileLines[j]}`;
      if (regex.test(text)) {
        end = j+1;
        return { start, end }
      }

      // If we've reached the end of an object, we start over at the next line
      if (/},*/.test(text)) {
        break;
      }
    }
  }

  return { start, end }
}

function suggest(title, suggestion) {
  return `${title}\n\`\`\`suggestion
${suggestion}
\`\`\``;
}

function getLineNumber(fileLines, regex) {
  for (let i = 0; i < fileLines.length; i++) {
    if (regex.test(fileLines[i])) {
      return i+1;
    }
  }
}

module.exports = {
  getLinesForJSON,
  suggest,
  getLineNumber
}