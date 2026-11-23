const counterpart = document.querySelector("a.blog-switch");
counterpart?.addEventListener("click", () => {
  try {
    localStorage.setItem("possibility:language", counterpart.hreflang === "en" ? "en" : "zh-TW");
  } catch {
    // The link remains usable when browser storage is unavailable.
  }
});
