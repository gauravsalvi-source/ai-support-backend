const fs = require('fs');

const knowledge = fs.readFileSync('robo.txt', 'utf8');
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
    } else {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines[0]) keywords.push(lines[0].toLowerCase());
    if (lines[1]) keywords.push(lines[1].toLowerCase());
    }

    if (keywords.length > 0) {
    kbEntries.push({ title: keywords[0], keywords, response: responsePart });
    }
}

function search(text) {
    const lowerText = text.trim().toLowerCase();
    const matches = [];

    for (const entry of kbEntries) {
    let matchScore = 0;
    
    for (const keyword of entry.keywords) {
        if (!keyword) continue;
        
        if (lowerText === keyword) {
            matchScore += 100 + keyword.length;
        } else if (lowerText.includes(keyword)) {
            matchScore += keyword.length;
        } else if (lowerText.length > 3 && keyword.includes(lowerText)) {
            matchScore += lowerText.length;
        }
    }

    if (matchScore > 0) {
        matches.push({ title: entry.title, score: matchScore, matchedKeywords: entry.keywords.filter(keyword => (keyword && (lowerText.includes(keyword) || (lowerText.length > 3 && keyword.includes(lowerText))))) });
    }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches;
}

console.log("Search for 'robo price increase':", JSON.stringify(search("robo price increase"), null, 2));
