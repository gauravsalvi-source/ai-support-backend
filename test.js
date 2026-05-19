const fs = require('fs');

const knowledge = fs.readFileSync('./knowledge.txt', 'utf8');
const blocks = knowledge.split(/(?:={3,}|-{3,})/g).map(b => b.trim()).filter(b => b.length > 0);
const kbEntries = [];

for (let block of blocks) {
  if (block === "SPREADR" || block === "Uninstall Steps") continue;

  const keywords = [];
  let responsePart = block;

  if (block.includes("TERMINOLOGY:") && block.includes("REQUIRED RESPONSE:")) {
    const termPart = block.split("REQUIRED RESPONSE:")[0].split("TERMINOLOGY:")[1].trim();
    responsePart = block.split("REQUIRED RESPONSE:")[1].trim();
    termPart.split('\n').forEach(line => {
      const kw = line.trim().toLowerCase();
      if (kw) keywords.push(kw);
    });
  } else if (block.includes("Trigger Words:") && block.includes("Required Response:")) {
    const parts = block.split("Required Response:");
    const triggerWordsPart = parts[0].replace("Trigger Words:", "").trim();
    responsePart = parts[1].trim();
    triggerWordsPart.split('\n').forEach(line => {
      const kw = line.replace('-', '').trim().toLowerCase();
      if (kw) keywords.push(kw);
    });
  } else {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines[0]) keywords.push(lines[0].toLowerCase());
    if (lines[1]) keywords.push(lines[1].toLowerCase());
  }

  if (keywords.length > 0) {
    kbEntries.push({ keywords, response: responsePart });
  }
}

console.log("Total entries parsed:", kbEntries.length);
kbEntries.forEach((e, i) => {
  console.log(`\nEntry ${i}:`);
  console.log("Keywords count:", e.keywords.length);
  console.log("Keywords sample:", e.keywords.slice(0, 3));
  console.log("Response preview:", e.response.substring(0, 50).replace(/\n/g, "\\n"));
});

// Test query
const text = "amazon referral id";
const lowerText = text.toLowerCase();
const matches = [];
const seenResponses = new Set();

for (const entry of kbEntries) {
  let matchScore = 0;
  for (const keyword of entry.keywords) {
    if (keyword && (lowerText.includes(keyword) || (lowerText.length > 3 && keyword.includes(lowerText)))) {
      matchScore++;
    }
  }
  if (matchScore > 0 && !seenResponses.has(entry.response)) {
    matches.push({ ...entry, score: matchScore });
    seenResponses.add(entry.response);
  }
}

matches.sort((a, b) => b.score - a.score);
console.log(`\nFound ${matches.length} matches for "${text}"`);
matches.forEach((m, i) => console.log(`Match ${i} Score: ${m.score} -> ${m.response.substring(0, 40).replace(/\n/g, "\\n")}`));
