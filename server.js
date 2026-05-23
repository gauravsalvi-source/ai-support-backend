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

    const apps = ['spreadr', 'outlink', 'pro', 'connectr', 'shipr', 'prime', 'smart', 'clever', 'robo', 'sleek', 'bolt', 'exporter'];
    let detectedApp = null;
    for (const app of apps) {
      if (lowerText.includes(app)) {
        detectedApp = app;
        break;
      }
    }

    let knowledge = "";
    if (detectedApp) {
const kbPath = path.join(
  __dirname,
  "knowledge",
  `${detectedApp}.txt`
);
      if (fs.existsSync(kbPath)) {
        knowledge = fs.readFileSync(kbPath, 'utf8');
        console.log(`[DEBUG] Detected app: ${detectedApp}, loaded knowledge base.`);
      } else {
        console.log(`[DEBUG] Detected app: ${detectedApp}, but ${kbPath} does not exist.`);
      }
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
  const cacheKey = lowerText.trim();

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

      if (lowerText === keyword) {
        matchScore += 100 + keyword.length;
      } else if (lowerText.includes(keyword)) {
        matchScore += keyword.length;
      } else if (
        lowerText.length > 3 &&
        keyword.includes(lowerText)
      ) {
        matchScore += lowerText.length;
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