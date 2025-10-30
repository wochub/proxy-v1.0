import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static front-end files
app.use(express.static("public"));

// Browse endpoint
app.get("/browse", async (req, res) => {
  let { url } = req.query as { url?: string };

  if (!url) {
    return res.status(400).send("Missing 'url' query parameter");
  }

  // Normalize URL
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    const content = await page.content();

    await browser.close();
    res.send(content);
  } catch (err) {
    console.error("Puppeteer error:", err);
    res.status(500).send("Error loading page");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
