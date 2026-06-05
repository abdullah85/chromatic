const content = document.querySelector("#content");

const state = {
  lastExtraction: null
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

const compact = (value, fallback = "Not found") => {
  const text = String(value || "").trim();
  return text || fallback;
};

function setContent(html) {
  content.innerHTML = html;
}

function renderLoading() {
  setContent(`
    <div class="loading" aria-label="Loading">
      <div class="skeleton" style="height: 84px"></div>
      <div class="skeleton" style="height: 64px"></div>
      <div class="skeleton" style="height: 64px"></div>
    </div>
  `);
}

function renderEmpty(message = "Navigate to a Chrome Web Store category, search, or extension page to get started.") {
  setContent(`
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `);
}

function renderError(message) {
  setContent(`
    <div class="error-state">
      <p>${escapeHtml(message)}</p>
      <button class="primary-action" data-action="refresh">Try again</button>
    </div>
  `);
}

function statCard(label, value, className = "") {
  return `
    <div class="stat-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value ${className}">${escapeHtml(compact(value))}</div>
    </div>
  `;
}

function detailRow(label, value) {
  if (!value) return "";

  return `
    <div class="detail-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderExtension(data) {
  const extension = data.extension;

  if (!extension) {
    renderEmpty("This Web Store page was detected, but no extension details were found.");
    return;
  }

  setContent(`
    <div class="page-label">Extension page</div>
    <section class="ext-detail">
      <div class="ext-header">
        ${extension.icon ? `<img class="ext-icon" src="${escapeHtml(extension.icon)}" alt="">` : `<div class="ext-icon"></div>`}
        <div class="ext-meta">
          <h2>${escapeHtml(compact(extension.name, "Untitled extension"))}</h2>
          <div class="developer">${escapeHtml(compact(extension.developer, "Developer not found"))}</div>
        </div>
      </div>

      <div class="stats-grid">
        ${statCard("Rating", extension.rating, "yellow")}
        ${statCard("Users", extension.users, "green")}
        ${statCard("Reviews", extension.reviews)}
        ${statCard("Updated", extension.updated)}
      </div>

      <div class="details-panel">
        ${detailRow("Category", extension.category)}
        ${detailRow("Version", extension.version)}
        ${detailRow("Size", extension.size)}
        ${detailRow("Languages", extension.languages)}
        ${detailRow("Extension ID", extension.id)}
      </div>

      ${extension.description ? `<p class="description">${escapeHtml(extension.description)}</p>` : ""}

      <div class="action-row">
        <button class="primary-action" data-action="save-current">Save snapshot</button>
        <button class="secondary-action" data-action="copy-current">Copy JSON</button>
      </div>
    </section>
  `);
}

function renderListing(data) {
  const listing = data.listing;

  if (!listing) {
    renderEmpty("This Web Store listing was detected, but no extension cards were found.");
    return;
  }

  setContent(`
    <div class="page-label">${data.pageType === "search" ? "Search results" : "Category listing"}</div>
    <div class="category-header">
      <h2>${escapeHtml(compact(listing.title, "Chrome Web Store listing"))}</h2>
      <div class="subtitle">${listing.count} extensions detected on this page</div>
    </div>
    <div class="action-row">
      <button class="primary-action" data-action="save-current">Save page data</button>
      <button class="secondary-action" data-action="copy-current">Copy JSON</button>
    </div>
    <div class="ext-list">
      ${listing.extensions.map((item) => `
        <a class="ext-item" href="${escapeHtml(item.url)}" data-url="${escapeHtml(item.url)}">
          ${item.icon ? `<img src="${escapeHtml(item.icon)}" alt="">` : `<div class="list-icon"></div>`}
          <div class="ext-item-info">
            <div class="ext-item-name">${escapeHtml(compact(item.name, "Untitled extension"))}</div>
            <div class="ext-item-stats">
              <span class="rating">${escapeHtml(compact(item.rating, "Rating n/a"))}</span>
              <span class="users">${escapeHtml(compact(item.users, "Users n/a"))}</span>
            </div>
          </div>
        </a>
      `).join("")}
    </div>
  `);
}

async function saveSnapshot() {
  if (!state.lastExtraction) return;

  const record = {
    ...state.lastExtraction,
    savedAt: new Date().toISOString()
  };

  const { snapshots = [] } = await chrome.storage.local.get("snapshots");
  await chrome.storage.local.set({ snapshots: [record, ...snapshots].slice(0, 250) });
  flashStatus("Saved");
}

async function copySnapshot() {
  if (!state.lastExtraction) return;

  await navigator.clipboard.writeText(JSON.stringify(state.lastExtraction, null, 2));
  flashStatus("Copied");
}

function flashStatus(message) {
  const header = document.querySelector("header");
  const status = document.createElement("span");
  status.className = "status-pill";
  status.textContent = message;
  header.append(status);
  setTimeout(() => status.remove(), 1400);
}

async function refresh() {
  renderLoading();

  const response = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_PAGE_STATE" });

  if (!response?.ok) {
    renderError(response?.message || "Could not extract data from this page.");
    return;
  }

  if (response.pageType === "unsupported") {
    state.lastExtraction = null;
    renderEmpty(response.message);
    return;
  }

  state.lastExtraction = response.data;

  if (response.data?.pageType === "extension") {
    renderExtension(response.data);
    return;
  }

  if (response.data?.pageType === "category" || response.data?.pageType === "search") {
    renderListing(response.data);
    return;
  }

  renderEmpty("Open an extension detail page, category listing, or search results page.");
}

content.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const link = event.target.closest("[data-url]");

  if (link) {
    event.preventDefault();
    await chrome.tabs.create({ url: link.dataset.url, active: true });
    return;
  }

  if (action === "refresh") refresh();
  if (action === "save-current") saveSnapshot();
  if (action === "copy-current") copySnapshot();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TAB_UPDATED") {
    refresh();
  }
});

refresh();
