import puppeteer from "puppeteer";

export async function getPageHTML(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

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
  return html;
}
