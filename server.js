require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/rewrite", async (req, res) => {

  try {

    const { text, tone } = req.body;

 const prompt =
`Rewrite this customer support reply in a ${tone} tone.

Make it:
- professional
- clear
- polite
- easy to understand

Return ONLY the rewritten message.
Do not add introductions, titles, explanations, or quotation marks.

Reply:
${text}`;

    const response = await axios.post(

      "https://api.groq.com/openai/v1/chat/completions",

      {
model: "llama-3.1-8b-instant",

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

    console.log(err.response?.data || err.message);

    res.status(500).json({
      error:
        err.response?.data?.error?.message ||
        err.message ||
        "Something went wrong"
    });

  }

});

app.listen(3000, () => {

  console.log(
    "Server running on port 3000"
  );

});