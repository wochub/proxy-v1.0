import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

// Serve front-end files
app.use(express.static("public"));

// Handle /browse endpoint
app.get("/browse", async (req, res) => {
  let { url } = req.query as { url?: string };

  if (!url) return res.status(400).send("Missing 'url' query parameter");

  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    const html = await page.content();

    await browser.close();
    res.send(html);
  } catch (error) {
    console.error("Puppeteer Error:", error);
    res.status(500).send("Error loading page");
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
