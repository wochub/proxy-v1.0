import puppeteer from "puppeteer-core";

export async function getPageHTML(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io?token=2TLCfXWWZ7oZbu027022e60d48f141b0a0e3996a1633f45d0`,
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  const html = await page.content();

  await browser.close();
  return html;
}
