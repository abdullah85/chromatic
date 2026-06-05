const WEBSTORE_ORIGIN = "https://chromewebstore.google.com";

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

function getWebStorePageType(url) {
  try {
    const { origin, pathname } = new URL(url);

    if (origin !== WEBSTORE_ORIGIN) {
      return "unsupported";
    }

    if (pathname.startsWith("/detail/")) {
      return "extension";
    }

    if (pathname.startsWith("/category/")) {
      return "category";
    }

    if (pathname.startsWith("/search/")) {
      return "search";
    }

    return "webstore";
  } catch {
    return "unsupported";
  }
}

function extractWebStorePage() {
  const pageUrl = location.href;
  const pageType = (() => {
    if (location.pathname.startsWith("/detail/")) return "extension";
    if (location.pathname.startsWith("/category/")) return "category";
    if (location.pathname.startsWith("/search/")) return "search";
    return "webstore";
  })();

  const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
  const textFrom = (selector) => normalize(document.querySelector(selector)?.textContent);
  const attrFrom = (selector, attribute) => document.querySelector(selector)?.getAttribute(attribute) || "";
  const bodyText = normalize(document.body?.innerText);

  const parseJsonLd = () => {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];

    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        const nodes = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] || [])];
        const match = nodes.find((node) => {
          const type = node?.["@type"];
          return type === "SoftwareApplication" || type === "Product" || type === "WebApplication";
        });

        if (match) return match;
      } catch {
        // Ignore malformed embedded data.
      }
    }

    return {};
  };

  const jsonLd = parseJsonLd();
  const meta = (name) =>
    attrFrom(`meta[name="${name}"]`, "content") ||
    attrFrom(`meta[property="${name}"]`, "content");

  const findByPattern = (pattern) => normalize(bodyText.match(pattern)?.[1]);
  const findLabelValue = (labels) => {
    const elements = [...document.querySelectorAll("div, span, section, li")];

    for (const element of elements) {
      const text = normalize(element.textContent);
      const label = labels.find((item) => new RegExp(`^${item}\\b`, "i").test(text));

      if (!label) continue;

      const value = normalize(text.replace(new RegExp(`^${label}\\b:?\\s*`, "i"), ""));
      if (value && value.length < 100) return value;

      const sibling = element.nextElementSibling;
      const siblingText = normalize(sibling?.textContent);
      if (siblingText && siblingText.length < 100) return siblingText;
    }

    return "";
  };

  const imageCandidates = [
    attrFrom('meta[property="og:image"]', "content"),
    attrFrom('img[src*="lh3.googleusercontent.com"]', "src"),
    attrFrom("img", "src")
  ].filter(Boolean);

  const title =
    normalize(jsonLd.name) ||
    textFrom("h1") ||
    meta("og:title") ||
    document.title.replace(/ - Chrome Web Store$/i, "");

  const rating =
    normalize(jsonLd.aggregateRating?.ratingValue) ||
    findByPattern(/([0-5](?:\.\d+)?)\s*(?:star|out of 5|rating)/i);

  const reviews =
    normalize(jsonLd.aggregateRating?.reviewCount || jsonLd.aggregateRating?.ratingCount) ||
    findByPattern(/([\d,.]+\s*[KMB]?\+?)\s+(?:ratings|reviews)/i);

  const users = findByPattern(/([\d,.]+\s*[KMB]?\+?)\s+users/i);
  const developer = findLabelValue(["Offered by", "Developer"]) || textFrom('a[href^="mailto:"]');
  const category = findLabelValue(["Category"]);
  const version = findLabelValue(["Version"]);
  const updated = findLabelValue(["Updated"]);
  const size = findLabelValue(["Size"]);
  const languages = findLabelValue(["Languages", "Language"]);
  const description =
    normalize(jsonLd.description) ||
    meta("description") ||
    textFrom('[itemprop="description"]');

  const extensionId = pageType === "extension" ? location.pathname.split("/").filter(Boolean).at(-1) : "";
  const cards = [...document.querySelectorAll('a[href^="/detail/"], a[href*="/detail/"]')];
  const seen = new Set();
  const extensions = cards.map((anchor) => {
    const href = new URL(anchor.getAttribute("href"), location.origin).href;
    const id = new URL(href).pathname.split("/").filter(Boolean).at(-1);

    if (!id || seen.has(id)) return null;
    seen.add(id);

    const container = anchor.closest("div, li, article") || anchor;
    const text = normalize(container.textContent);
    const img = container.querySelector("img");

    return {
      id,
      name: normalize(anchor.getAttribute("aria-label")) || normalize(anchor.textContent).split(/\d(?:\.\d)?/)[0] || "Untitled extension",
      url: href,
      icon: img?.src || "",
      rating: normalize(text.match(/([0-5](?:\.\d+)?)\s*(?:star|rating)?/i)?.[1]),
      users: normalize(text.match(/([\d,.]+\s*[KMB]?\+?)\s+users/i)?.[1])
    };
  }).filter(Boolean).slice(0, 40);

  return {
    pageType,
    pageUrl,
    extractedAt: new Date().toISOString(),
    extension: pageType === "extension" ? {
      id: extensionId,
      name: title,
      url: pageUrl,
      icon: imageCandidates[0] || "",
      developer,
      rating,
      reviews,
      users,
      category,
      version,
      updated,
      size,
      languages,
      description
    } : null,
    listing: pageType === "category" || pageType === "search" ? {
      title: title || document.title,
      count: extensions.length,
      extensions
    } : null
  };
}

function extractWebStoreHtml(html, pageUrl) {
  const normalize = (value) => (value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const page = new URL(pageUrl);
  const pageType = getWebStorePageType(pageUrl);
  const text = normalize(html);
  const find = (pattern) => normalize(html.match(pattern)?.[1]);
  const findText = (pattern) => normalize(text.match(pattern)?.[1]);
  const meta = (name) =>
    find(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i")) ||
    find(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"));

  const jsonLd = (() => {
    const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

    for (const [, rawJson] of scripts) {
      try {
        const parsed = JSON.parse(rawJson);
        const nodes = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] || [])];
        const match = nodes.find((node) => {
          const type = node?.["@type"];
          return type === "SoftwareApplication" || type === "Product" || type === "WebApplication";
        });

        if (match) return match;
      } catch {
        // Ignore malformed embedded data.
      }
    }

    return {};
  })();

  const title =
    normalize(jsonLd.name) ||
    meta("og:title") ||
    find(/<title[^>]*>([\s\S]*?)<\/title>/i).replace(/ - Chrome Web Store$/i, "");

  const rating =
    normalize(jsonLd.aggregateRating?.ratingValue) ||
    findText(/([0-5](?:\.\d+)?)\s*(?:star|out of 5|rating)/i);

  const reviews =
    normalize(jsonLd.aggregateRating?.reviewCount || jsonLd.aggregateRating?.ratingCount) ||
    findText(/([\d,.]+\s*[KMB]?\+?)\s+(?:ratings|reviews)/i);

  const extensionId = pageType === "extension" ? page.pathname.split("/").filter(Boolean).at(-1) : "";

  return {
    pageType,
    pageUrl,
    extractedAt: new Date().toISOString(),
    extractionSource: "page-html",
    extension: pageType === "extension" ? {
      id: extensionId,
      name: title,
      url: pageUrl,
      icon: meta("og:image"),
      developer: findText(/(?:Offered by|Developer)\s+([^|]{2,80})/i),
      rating,
      reviews,
      users: findText(/([\d,.]+\s*[KMB]?\+?)\s+users/i),
      category: findText(/Category\s+([^|]{2,80})/i),
      version: findText(/Version\s+([^|]{1,40})/i),
      updated: findText(/Updated\s+([^|]{4,40})/i),
      size: findText(/Size\s+([^|]{1,40})/i),
      languages: findText(/Languages?\s+([^|]{2,80})/i),
      description: normalize(jsonLd.description) || meta("description")
    } : null,
    listing: pageType === "category" || pageType === "search" ? {
      title,
      count: 0,
      extensions: []
    } : null
  };
}

async function extractTab(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractWebStorePage
  });

  return result?.result;
}

async function extractTabWithFallback(tab) {
  try {
    const data = await extractTab(tab.id);
    return data ? { ...data, extractionSource: "page-dom" } : data;
  } catch (error) {
    const response = await fetch(tab.url);
    const html = await response.text();
    return extractWebStoreHtml(html, tab.url);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getActivePageState() {
  const tab = await getActiveTab();

  if (!tab?.id) {
    return { ok: false, pageType: "unsupported", message: "No active tab found." };
  }

  const pageType = getWebStorePageType(tab.url || "");

  if (pageType === "unsupported") {
    return {
      ok: true,
      pageType,
      url: tab.url || "",
      message: "Open a Chrome Web Store extension, category, or search page."
    };
  }

  const data = await extractTabWithFallback(tab);
  return { ok: true, pageType, tabId: tab.id, url: tab.url, data };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GET_ACTIVE_PAGE_STATE") {
    return false;
  }

  getActivePageState()
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        pageType: "error",
        message: error?.message || "Could not extract data from the current page."
      });
    });

  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.runtime.sendMessage({
      type: "TAB_UPDATED",
      url: tab.url,
      tabId,
      pageType: getWebStorePageType(tab.url)
    }).catch(() => {
      // Panel may not be open yet, ignore
    });
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) {
      chrome.runtime.sendMessage({
        type: "TAB_UPDATED",
        url: tab.url,
        tabId,
        pageType: getWebStorePageType(tab.url)
      }).catch(() => {});
    }
  } catch {
    // Ignore tabs that cannot be inspected.
  }
});
