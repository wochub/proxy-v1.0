import express from "express";
import puppeteer from "puppeteer-core";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Serve everything in /public
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/browse", async (req, res) => {
  try {
    let { url } = req.query as { url?: string };
    if (!url) return res.status(400).send("Missing 'url' query parameter");

    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    // Connect to Browserless.io instead of local Chrome
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`,
    });

    const page = await browser.newPage();

    // Handle navigation timeout gracefully
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {
      res.status(504).send("Page took too long to load.");
      return;
    });

    // If response already sent (timeout), skip the rest
    if (res.headersSent) return;

    const content = await page.content();
    await browser.close();

    res.status(200).send(content);
  } catch (err) {
    console.error("Puppeteer error:", err);
    res.status(500).send("Server error: " + (err as Error).message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
