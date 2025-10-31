import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/browse", async (req, res) => {
  let { url } = req.query as { url?: string };
  if (!url) return res.status(400).send("Missing 'url' parameter");

  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
      executablePath:
        "/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome",
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const content = await page.content();
    await browser.close();

    res.send(content);
  } catch (err) {
    console.error("Puppeteer error:", err);
    res.status(500).send("Server error: " + (err as Error).message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
