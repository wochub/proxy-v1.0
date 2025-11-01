const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const browserFrame = document.getElementById("browserFrame");

goBtn.addEventListener("click", async () => {
  const url = urlInput.value;
  if (!url) return;

  try {
    // Instead of directly setting iframe src, fetch HTML from your server
    const response = await fetch(`/browse?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("Failed to fetch page");

    const html = await response.text();

    // Write the HTML directly into the iframe
    const iframeDoc =
      browserFrame.contentDocument || browserFrame.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  } catch (err) {
    console.error(err);
    alert("Could not load page. Check console for details.");
  }
});
