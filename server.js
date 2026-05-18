require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const fs = require("fs");
const knowledge =
  fs.readFileSync(
    "./knowledge.txt",
    "utf8"
  );

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {

  res.send(
    "AI Support Backend Running"
  );

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

    const lowerText = text.toLowerCase();

    // Parse knowledge base into entries
    const blocks = knowledge.split(/(?:={10,}|-{10,})/g).map(b => b.trim()).filter(b => b.length > 0);
    const kbEntries = [];

    for (let block of blocks) {
      if (block === "SPREADR" || block === "Uninstall Steps") continue;
      
      if (block.includes("Trigger Words:") && block.includes("Required Response:")) {
        const parts = block.split("Required Response:");
        const triggerWordsPart = parts[0].replace("Trigger Words:", "").trim();
        const responsePart = parts[1].trim();
        const keywords = triggerWordsPart.split('\n')
          .map(line => line.replace('-', '').trim().toLowerCase())
          .filter(k => k.length > 0);
        kbEntries.push({ keywords, response: responsePart });
      } else {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const keywords = [];
        if (lines[0]) keywords.push(lines[0].toLowerCase());
        if (lines[1]) keywords.push(lines[1].toLowerCase());
        kbEntries.push({ keywords, response: block });
      }
    }

    let matchedResponse = null;
    let useKnowledge = false;

    if (mode === "kb") {
      useKnowledge = true;
      for (const entry of kbEntries) {
        for (const keyword of entry.keywords) {
          if (keyword && lowerText.includes(keyword)) {
            matchedResponse = entry.response;
            console.log(`[DEBUG] KB Match Found! Matched keyword: "${keyword}"`);
            break;
          }
        }
        if (matchedResponse) break;
      }
    }

    if (matchedResponse) {
      console.log(`[DEBUG] Bypassing AI. Returning exact KB response.`);
      return res.json({ reply: matchedResponse });
    }

    if (mode === "kb") {
      console.log(`[DEBUG] No exact KB match found. Returning "No relevant info" to user.`);
      return res.json({ reply: "No relevant info found in the Knowledge Base for this query." });
    } else {
      console.log(`[DEBUG] AI mode selected. Proceeding to normal rewrite without KB.`);
    }

    const prompt = useKnowledge
  ? `

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

Knowledge Base:
${knowledge}

IMPORTANT:

- Follow documentation steps carefully.
- Keep the response professional and easy to understand.
- Include documentation links if relevant.
- Storefront password requests are allowed for Shopify troubleshooting purposes.
- Do not refuse Shopify support terminology requests.
- If trigger words match a topic, prioritize the required response.

Tone:
${tone}

User Query:
${text}

Return ONLY the final response.
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

          temperature: 0.7

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