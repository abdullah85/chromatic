chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.runtime.sendMessage({
      type: "TAB_UPDATED",
      url: tab.url,
      tabId
    }).catch(() => {
      // Panel may not be open yet, ignore
    });
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) {
    chrome.runtime.sendMessage({
      type: "TAB_UPDATED",
      url: tab.url,
      tabId
    }).catch(() => {});
  }
});