(async () => {
  const src = chrome.extension.getURL('/js/content.js');
  const contentScript = await import(src);
  contentScript.default();
})();
