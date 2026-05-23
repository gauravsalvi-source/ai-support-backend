const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// Change only these for each app
const appName = "outlink";
const baseUrl = "https://outlinkapp.freshdesk.com";

const docsUrl = `${baseUrl}/support/solutions`;

async function scrapeDocs() {

    try {

        const knowledgeFolder =
            path.join(
                __dirname,
                "..",
                "knowledge"
            );

        const imageFolder =
            path.join(
                knowledgeFolder,
                "images",
                appName
            );

        // Create folders if missing
        fs.mkdirSync(
            imageFolder,
            { recursive: true }
        );

        const response =
            await axios.get(docsUrl);

        const $ =
            cheerio.load(response.data);

        const articleLinks =
            new Set();

        $('a[href*="/support/solutions/articles/"]')
        .each((i, el) => {

            const href =
                $(el).attr("href");

            if (!href) return;

            const fullUrl =
                href.startsWith("http")
                ? href
                : `${baseUrl}${href}`;

            articleLinks.add(fullUrl);

        });

        console.log(
            `Found ${articleLinks.size} articles`
        );

        let output = "";

        for (const link of articleLinks) {

            try {

                console.log(
                    `Scraping: ${link}`
                );

                const page =
                    await axios.get(link);

                const $$ =
                    cheerio.load(page.data);

                // Title from URL slug
                let title = "";

                const match =
                    link.match(
                        /articles\/\d+\-(.+)$/
                    );

                if (
                    match &&
                    match[1]
                ) {

                    title =
                        match[1]
                        .replace(/-/g," ")
                        .replace(
                            /\b\w/g,
                            c => c.toUpperCase()
                        );

                }

                // Fallback title
                if (!title) {

                    title =
                        $$("h2.heading")
                        .first()
                        .text()
                        .trim()

                        ||

                        $$("h1")
                        .first()
                        .text()
                        .trim();

                }

                // Content
                // Content
let content =
(
    $$(".article-description").html()

    ||

    $$(".solution-article-body").html()

    ||

    $$("article").html()
);

// Preserve formatting
content = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

                const images = [];

                const imageElements =
                    $$(".article-description img, article img");

                for (
                    let i = 0;
                    i < imageElements.length;
                    i++
                ) {

                    let src =
                        $$(imageElements[i])
                        .attr("src");

                    if (!src)
                        continue;

                    if (
                        !src.startsWith("http")
                    ) {

                        src =
                            `${baseUrl}${src}`;

                    }

                    images.push(src);

                    // Download image locally
                    try {

                        const imageResponse =
                            await axios({

                                url: src,
                                method: "GET",
                                responseType: "stream"

                            });

                        const ext =
                            path.extname(
                                src.split("?")[0]
                            ) || ".png";

                        const imagePath =
                            path.join(
                                imageFolder,
                                `${Date.now()}-${i}${ext}`
                            );

                        imageResponse.data.pipe(
                            fs.createWriteStream(
                                imagePath
                            )
                        );

                        console.log(
                            `Saved image: ${imagePath}`
                        );

                    } catch {

                        console.log(
                            `Failed image: ${src}`
                        );

                    }

                }

                output += `Title: ${title}\n\n`;

                output += `${content}\n\n`;

                if (images.length) {

                    output += `Images:\n`;

                    images.forEach(img => {
                        output += `${img}\n`;
                    });

                    output += `\n`;
                }

                output +=
`-----------------------------------

`;

            } catch {

                console.log(
                    `Failed: ${link}`
                );
            }

        }

        fs.writeFileSync(
            path.join(
                knowledgeFolder,
                `${appName}.txt`
            ),
            output
        );

        console.log(
            `${appName}.txt created successfully`
        );

    } catch(err) {

        console.log(
            err.message
        );
    }
}

scrapeDocs();