import express from "express";
import puppeteer from "puppeteer";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/browse", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("Missing URL");

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 20000 });

    const content = await page.content();
    await browser.close();

    res.send(content);
  } catch (err: any) {
    console.error("Puppeteer error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
