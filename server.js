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
      tone
    } = req.body;

const lowerText =
  text.toLowerCase();

let useKnowledge = false;

const triggerWords = [
  "terminate",
  "aws",
  "uninstall",
  "sync",
  "csv",
  "fulfillment"
];

triggerWords.forEach(word => {

  if (
    lowerText.includes(word)
  ) {

    useKnowledge = true;

  }

});


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