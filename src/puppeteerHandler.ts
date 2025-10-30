import puppeteer from "puppeteer";

export default async function renderPage(url: string): Promise<string> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2" });
    const content = await page.content();
    return content;
  } catch (err) {
    return `<h1>Error loading page</h1><p>${err}</p>`;
  } finally {
    await browser.close();
  }
}
