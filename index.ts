import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/browse", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).send("Missing URL parameter");
  }

  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const content = await page.content();
    await browser.close();

    res.send(content);
  } catch (error) {
    console.error("Puppeteer error:", error);
    res.status(500).send("Server error: " + (error as Error).message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
