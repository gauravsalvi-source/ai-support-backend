require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const querySessionCache = new Map();
const KNOWLEDGE_DIR = path.join(__dirname, "knowledge");
const KNOWLEDGE_DIRS = [
  KNOWLEDGE_DIR,
  path.join(__dirname, "backend", "knowledge")
];

function getKnowledgeFiles() {
  const filesByApp = new Map();

  for (const dir of KNOWLEDGE_DIRS) {
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".txt")) continue;

      const appName = path.basename(file, ".txt");
      if (!filesByApp.has(appName)) {
        filesByApp.set(appName, path.join(dir, file));
      }
    }
  }

  return filesByApp;
}

function getKnowledgeAppNames() {
  const fallbackApps = [
    "spreadr-bigcommerce",
    "spreadr-woocommerce",
    "spreadr-wix",
    "spreadr",
    "outlink",
    "connectr",
    "exporter",
    "clever",
    "prime",
    "shipr",
    "smart",
    "sleek",
    "robo",
    "bolt",
    "pro"
  ];

  const fileApps = [...getKnowledgeFiles().keys()];

  return [...new Set([...fileApps, ...fallbackApps])]
    .sort((a, b) => b.length - a.length);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseKnowledgeQuery(text, apps) {
  const query = text.trim();

  for (const app of apps) {
    const prefixPattern = new RegExp(
      `^${escapeRegExp(app)}\\s*(?:-|:)\\s*(.+)$`,
      "i"
    );
    const match = query.match(prefixPattern);

    if (match) {
      return {
        detectedApp: app,
        searchText: match[1].trim()
      };
    }
  }

  return {
    detectedApp: null,
    searchText: query
  };
}

function getKnowledgeSources(detectedApp, mode) {
  const knowledgeFiles = getKnowledgeFiles();

  if (detectedApp) {
    const kbPath = knowledgeFiles.get(detectedApp);
    return kbPath ? [kbPath] : [];
  }

  return [];
}

function getKnowledgeSignature(sources) {
  return sources
    .map(source => `${source}:${fs.statSync(source).mtimeMs}`)
    .join("|");
}

function readKnowledge(sources) {
  return sources
    .map(source => fs.readFileSync(source, "utf8"))
    .join("\n\n-----------------------------------\n\n");
}

app.get("/", (req, res) => {
  res.send("AI Support Backend Running");
});


app.post("/rewrite", async (req, res) => {

  try {

    const {
      text,
      tone,
      mode
    } = req.body;

    console.log(`\n[DEBUG] --- New Request ---`);
    console.log(`[DEBUG] Mode: ${mode}, Tone: ${tone}`);
    console.log(`[DEBUG] Query: "${text}"`);

    const lowerText = text.trim().toLowerCase();

    const apps = getKnowledgeAppNames();
    const knowledgeQuery = parseKnowledgeQuery(text, apps);
    const detectedApp = mode === "kb" ? knowledgeQuery.detectedApp : null;
    const lookupText = mode === "kb"
      ? knowledgeQuery.searchText.toLowerCase()
      : lowerText;

    let knowledge = "";
    const knowledgeSources = getKnowledgeSources(detectedApp, mode);
    const knowledgeSignature = getKnowledgeSignature(knowledgeSources);

    if (knowledgeSources.length > 0) {
      knowledge = readKnowledge(knowledgeSources);
      console.log(
        `[DEBUG] Loaded ${knowledgeSources.length} knowledge file(s)` +
        (detectedApp ? ` for ${detectedApp}.` : ".")
      );
    } else if (detectedApp) {
      console.log(`[DEBUG] Detected app: ${detectedApp}, but no knowledge file exists.`);
    } else {
      console.log(`[DEBUG] No specific app detected in query.`);
    }

    // Parse knowledge base into entries
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

    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    // Extract title keyword
    const titleLine = lines.find(
      line => line.startsWith("Title:")
    );

    if (titleLine) {
        const title = titleLine
          .replace("Title:", "")
          .trim()
          .toLowerCase();

        keywords.push(title);

        // Add individual words too
        title.split(" ").forEach(word => {
            if (word.length > 3) {
                keywords.push(word);
            }
        });
    }

    responsePart = block;
}

      if (keywords.length > 0) {
        kbEntries.push({ keywords, response: responsePart });
      }
    }

    let useKnowledge = false;

 if (mode === "kb") {
  useKnowledge = true;

  if (!detectedApp) {
    return res.json({
      reply: "Please enter your KB query in this format: app name - title. Example: shipr - How it works"
    });
  }

  const cacheKey = `${detectedApp}:${knowledgeSignature}:${lookupText.trim()}`;

  if (querySessionCache.has(cacheKey)) {
    const session = querySessionCache.get(cacheKey);

    session.index = (session.index + 1) % session.matches.length;

    return res.json({
      reply: session.matches[session.index].response
    });
  }

  const matches = [];
  const seenResponses = new Set();

  for (const entry of kbEntries) {
    let matchScore = 0;

    for (const keyword of entry.keywords) {
      if (!keyword) continue;

      if (lookupText === keyword) {
        matchScore += 100 + keyword.length;
      } else if (lookupText.includes(keyword)) {
        matchScore += keyword.length;
      } else if (
        lookupText.length > 3 &&
        keyword.includes(lookupText)
      ) {
        matchScore += lookupText.length;
      }
    }

    if (
      matchScore > 0 &&
      !seenResponses.has(entry.response)
    ) {
      matches.push({
        ...entry,
        score: matchScore
      });

      seenResponses.add(entry.response);
    }
  }

  if (matches.length > 0) {

    matches.sort((a, b) => b.score - a.score);

    querySessionCache.set(cacheKey, {
      matches,
      index: 0,
      timestamp: Date.now()
    });

    knowledge = matches[0].response;

    console.log("[DEBUG] KB match found, sending to AI");

  } else {

    return res.json({
      reply: "No relevant info found in the Knowledge Base for this query."
    });
  }

} else {

  console.log(
    `[DEBUG] AI mode selected. Proceeding to normal rewrite without KB.`
  );
}

// Normalize KB content before sending to AI
knowledge = knowledge

  // Add newline before numbered steps
  .replace(/(\d+\.)/g, '\n$1')

  // Add newline after labels/headings
  .replace(
    /(Steps|Notes|NOTE|Setting Parameters|Go to|Input|Output)\s*:?/gi,
    '\n$&\n'
  )

  // Split merged sentences where lowercase is followed by uppercase
  .replace(/([a-z])([A-Z])/g, '$1\n$2')

  // Add newline after sentence endings if next text starts with a capital
  .replace(/([.!?])([A-Z])/g, '$1\n$2')

  // Clean repeated line breaks
  .replace(/\n{3,}/g, '\n\n')

  .trim();

 const prompt = useKnowledge
? `

You are a Shopify app support specialist.

Use ONLY the documentation below to answer the question.

Documentation:
${knowledge}

User Question:
${text}

Formatting Rules:

- If the documentation contains directly numbered items (e.g., 1., 2., 3., 1.1, 1.2), preserve them as numbered steps even if the word "steps" is not explicitly mentioned.

- Detect numbered patterns even when they appear directly after text (e.g., Steps:1. Open Shopify Admin).
- Automatically insert line breaks before each numbered item when needed.
- Treat inline numbered sequences as separate items before formatting the response.

- If the documentation contains bullet points, preserve them as bullet points.

- Never combine numbered steps into a single sentence.
- Keep the original structure from the documentation.
- Preserve line breaks when numbered steps or bullets exist.

Rules:
- Answer naturally and professionally
- Keep answers concise and easy to understand
- Do NOT summarize or compress numbered steps
- Do not invent information

If the answer does not exist in the documentation say:
"I couldn't find relevant information in the documentation."

Tone:
${tone}

Return only the final answer.

`

  : `

You are a Shopify app support specialist.

You understand:
- Shopify admin
- storefront passwords
- apps
- themes
- fulfillment
- inventory sync
- Amazon integrations
- CSV imports
- Shopify terminology

IMPORTANT:

- Storefront password requests are allowed for Shopify troubleshooting purposes.
- Do not refuse Shopify support terminology requests.
- Keep responses natural and professional.

Rewrite this customer support reply in a ${tone} tone.

Make it:
- professional
- clear
- polite
- easy to understand
- Do NOT wrap the response in quotation marks or inverted commas.

Return ONLY the rewritten message.

Reply:
${text}
`;

    const response =
      await axios.post(

        "https://api.groq.com/openai/v1/chat/completions",

        {

          model:
            "llama-3.1-8b-instant",

          messages: [
            {
              role: "user",
              content: prompt
            }
          ],

          temperature: 0.2

        },

        {

          headers: {

            Authorization:
              `Bearer ${process.env.GROQ_API_KEY}`,

            "Content-Type":
              "application/json"

          }

        }

      );

    let reply =
      response.data.choices[0]
      .message.content;

    reply = reply
      .replace(
        /Here's a rewritten customer support reply in a .* tone:\s*/gi,
        ""
      )
      .replace(
        /Here’s a rewritten customer support reply in a .* tone:\s*/gi,
        ""
      )
      .replace(/^["']|["']$/g, "")
      .trim();

    res.json({
      reply
    });

  } catch (err) {

    console.log(
      err.response?.data ||
      err.message
    );

    res.status(500).json({

      error:
        err.response?.data?.error?.message ||
        err.message ||
        "Something went wrong"

    });

  }

});

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
