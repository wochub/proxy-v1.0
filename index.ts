import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/browse", async (req, res) => {
  let { url } = req.query as { url?: string };
  if (!url) return res.status(400).send("Missing 'url' query parameter");

  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    const response = await fetch(
      `https://chrome.browserless.io/content?token=${
        process.env.BROWSERLESS_API_KEY
      }&url=${encodeURIComponent(url)}`
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .send("Error fetching page from Browserless");
    }

    const html = await response.text();
    res.send(html);
  } catch (err) {
    console.error("Browserless fetch error:", err);
    res.status(500).send("Server error: " + (err as Error).message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
