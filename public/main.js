const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const browserFrame = document.getElementById("browserFrame");

goBtn.addEventListener("click", () => {
  const url = urlInput.value;
  if (!url) return;
  browserFrame.src = `/browse?url=${encodeURIComponent(url)}`;
});
