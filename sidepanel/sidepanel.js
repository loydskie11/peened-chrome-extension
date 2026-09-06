// Peened Side Panel - Moodboard & Swipe File Controller

let allPins = [];
let currentFilter = "all";
let selectedTag = null;
let searchQuery = "";

// DOM Elements
const pinsContainer = document.getElementById("pins-container");
const emptyState = document.getElementById("empty-state");
const badgeCount = document.getElementById("badge-count");
const searchInput = document.getElementById("search-input");
const btnClearSearch = document.getElementById("btn-clear-search");
const typeFilters = document.getElementById("type-filters");
const tagCloud = document.getElementById("tag-cloud");
const btnExport = document.getElementById("btn-export");
const btnClearAll = document.getElementById("btn-clear-all");
const btnManualAdd = document.getElementById("btn-manual-add");
const modalOverlay = document.getElementById("modal-overlay");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnCancelModal = document.getElementById("btn-cancel-modal");
const btnSaveModal = document.getElementById("btn-save-modal");
const manualContent = document.getElementById("manual-content");
const manualTags = document.getElementById("manual-tags");
const sidepanelToast = document.getElementById("sidepanel-toast");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadPins();
  setupEventListeners();
});

// Load pins from Chrome Storage
async function loadPins() {
  const data = await chrome.storage.local.get({ peened_pins: [] });
  allPins = data.peened_pins || [];
  renderMoodboard();
}

// React to storage changes automatically
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.peened_pins) {
    allPins = changes.peened_pins.newValue || [];
    renderMoodboard();
  }
});

// Event Listeners Setup
function setupEventListeners() {
  // Search Input with 150ms debounce to optimize DOM performance
  let searchDebounceTimer = null;
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    btnClearSearch.style.display = searchQuery ? "block" : "none";
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      renderMoodboard();
    }, 150);
  });

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    btnClearSearch.style.display = "none";
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    renderMoodboard();
  });

  // Type Filter Pills
  typeFilters.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;

    typeFilters.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");

    currentFilter = pill.getAttribute("data-type");
    renderMoodboard();
  });

  // Export JSON
  btnExport.addEventListener("click", exportPinsAsJson);

  // Clear All Pins
  btnClearAll.addEventListener("click", () => {
    if (allPins.length === 0) return;
    if (confirm("Are you sure you want to clear all pins from your moodboard?")) {
      chrome.storage.local.set({ peened_pins: [] }, () => {
        chrome.runtime.sendMessage({ action: "REFRESH_BADGE" });
        showToast("All pins cleared");
      });
    }
  });

  // Manual Add Modal Controls
  btnManualAdd.addEventListener("click", () => {
    modalOverlay.style.display = "flex";
    manualContent.value = "";
    manualTags.value = "";
    manualContent.focus();
  });

  const closeModal = () => {
    modalOverlay.style.display = "none";
  };

  btnCloseModal.addEventListener("click", closeModal);
  btnCancelModal.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  btnSaveModal.addEventListener("click", saveManualPin);
}

// Render the Moodboard
function renderMoodboard() {
  badgeCount.textContent = allPins.length;

  // Filter Pins
  let filtered = allPins.filter((pin) => {
    // Type Filter
    if (currentFilter !== "all" && pin.type !== currentFilter) {
      return false;
    }

    // Tag Filter
    if (selectedTag && (!pin.tags || !pin.tags.includes(selectedTag))) {
      return false;
    }

    // Search Query
    if (searchQuery) {
      const contentMatch = (pin.content || "").toLowerCase().includes(searchQuery);
      const titleMatch = (pin.pageTitle || "").toLowerCase().includes(searchQuery);
      const domainMatch = (pin.domain || "").toLowerCase().includes(searchQuery);
      const tagMatch = (pin.tags || []).some((t) => t.toLowerCase().includes(searchQuery));
      return contentMatch || titleMatch || domainMatch || tagMatch;
    }

    return true;
  });

  // Render Tag Cloud
  renderTagCloud();

  // Handle Empty State
  if (allPins.length === 0) {
    pinsContainer.innerHTML = "";
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  if (filtered.length === 0) {
    pinsContainer.innerHTML = `
      <div style="text-align:center; padding: 40px 10px; color: var(--text-muted); font-size: 12px;">
        No pins match your current search or filters.
      </div>
    `;
    return;
  }

  // Render Pin Cards
  pinsContainer.innerHTML = filtered.map((pin) => createPinCardHtml(pin)).join("");

  // Attach card event listeners
  attachCardEvents();
}

// Build Tag Cloud
function renderTagCloud() {
  const allTags = new Set();
  allPins.forEach((pin) => {
    if (pin.tags && Array.isArray(pin.tags)) {
      pin.tags.forEach((t) => allTags.add(t));
    }
  });

  if (allTags.size === 0) {
    tagCloud.style.display = "none";
    return;
  }

  tagCloud.style.display = "flex";
  tagCloud.innerHTML = Array.from(allTags)
    .map(
      (tag) => `
      <span class="tag-badge ${selectedTag === tag ? "active" : ""}" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
      </span>
    `
    )
    .join("");

  tagCloud.querySelectorAll(".tag-badge").forEach((badge) => {
    badge.addEventListener("click", () => {
      const clickedTag = badge.getAttribute("data-tag");
      selectedTag = selectedTag === clickedTag ? null : clickedTag;
      renderMoodboard();
    });
  });
}

// Create Card HTML
function createPinCardHtml(pin) {
  const timeFormatted = formatTimeAgo(pin.createdAt);
  const domain = pin.domain || "web";
  const tagsHtml = (pin.tags || [])
    .map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`)
    .join("");

  const safeSourceUrl = sanitizeUrl(pin.sourceUrl);
  const safeFavicon = sanitizeUrl(pin.favicon);

  let bodyHtml = "";
  if (pin.type === "image") {
    const safeImgSrc = sanitizeUrl(pin.content);
    bodyHtml = `
      <div class="pin-image-wrapper">
        <img 
          src="${escapeHtml(safeImgSrc)}" 
          class="pin-img" 
          alt="Pinned reference" 
          loading="lazy" 
          onerror="handleImageError(this, '${escapeHtml(safeSourceUrl)}')" 
        />
      </div>
    `;
  } else if (pin.type === "text") {
    bodyHtml = `
      <div class="pin-text-body">${escapeHtml(pin.content)}</div>
    `;
  } else {
    const safeLinkUrl = sanitizeUrl(pin.content);
    bodyHtml = `
      <div class="pin-link-body">
        <a href="${escapeHtml(safeSourceUrl)}" target="_blank" rel="noopener noreferrer" class="pin-link-title">${escapeHtml(pin.pageTitle || pin.content)}</a>
        <div class="pin-link-url">${escapeHtml(safeLinkUrl)}</div>
      </div>
    `;
  }

  return `
    <article class="pin-card" data-id="${pin.id}">
      <header class="pin-header">
        <a href="${escapeHtml(safeSourceUrl)}" target="_blank" rel="noopener noreferrer" class="pin-source" title="${escapeHtml(pin.pageTitle || "")}">
          ${safeFavicon && safeFavicon !== "#" ? `<img src="${escapeHtml(safeFavicon)}" class="pin-favicon" alt="" onerror="this.style.display='none'"/>` : `<svg class="pin-favicon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`}
          <span class="pin-domain">${escapeHtml(domain)}</span>
        </a>
        <span class="pin-time">${timeFormatted}</span>
      </header>

      ${bodyHtml}

      ${tagsHtml ? `<div class="pin-tags-container">${tagsHtml}</div>` : ""}

      <footer class="pin-footer">
        <div class="action-group">
          <button class="action-btn btn-copy" title="Copy to clipboard">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <a href="${escapeHtml(safeSourceUrl)}" target="_blank" rel="noopener noreferrer" class="action-btn" title="Open original source">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          <button class="action-btn btn-tag" title="Edit tags">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </button>
        </div>
        <div class="action-group">
          <button class="action-btn danger btn-delete" title="Delete pin">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </footer>
    </article>
  `;
}

// Attach Event Listeners to Card Buttons
function attachCardEvents() {
  pinsContainer.querySelectorAll(".pin-card").forEach((card) => {
    const pinId = card.getAttribute("data-id");
    const pin = allPins.find((p) => p.id === pinId);
    if (!pin) return;

    // Copy to clipboard
    const copyBtn = card.querySelector(".btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => copyPinContent(pin));
    }

    // Delete pin
    const deleteBtn = card.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => deletePin(pin.id));
    }

    // Edit tags
    const tagBtn = card.querySelector(".btn-tag");
    if (tagBtn) {
      tagBtn.addEventListener("click", () => editPinTags(pin));
    }
  });
}

// Copy Pin Content to Clipboard
async function copyPinContent(pin) {
  try {
    if (pin.type === "image") {
      // Try copying image blob directly to clipboard
      try {
        const response = await fetch(pin.content);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        showToast("Image copied to clipboard!");
        return;
      } catch (err) {
        // Fallback to copying image URL
        await navigator.clipboard.writeText(pin.content);
        showToast("Image URL copied to clipboard!");
        return;
      }
    } else {
      await navigator.clipboard.writeText(pin.content);
      showToast("Copied to clipboard!");
    }
  } catch (err) {
    showToast("Failed to copy: " + err.message);
  }
}

// Delete Pin
async function deletePin(pinId) {
  const updatedPins = allPins.filter((p) => p.id !== pinId);
  await chrome.storage.local.set({ peened_pins: updatedPins });
  chrome.runtime.sendMessage({ action: "REFRESH_BADGE" });
  showToast("Pin deleted");
}

// Edit Pin Tags
async function editPinTags(pin) {
  const currentTags = (pin.tags || []).join(", ");
  const newTagsStr = prompt("Enter tags (comma separated, e.g. #edit, #idea):", currentTags);
  if (newTagsStr === null) return; // user cancelled

  const tags = newTagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : "#" + t));

  const updatedPins = allPins.map((p) => {
    if (p.id === pin.id) {
      return { ...p, tags };
    }
    return p;
  });

  await chrome.storage.local.set({ peened_pins: updatedPins });
  showToast("Tags updated");
}

// Save Manual Pin from Modal
async function saveManualPin() {
  const content = manualContent.value.trim();
  if (!content) {
    alert("Please enter some content for the pin.");
    return;
  }

  const selectedTypeRadio = document.querySelector('input[name="manual-type"]:checked');
  const type = selectedTypeRadio ? selectedTypeRadio.value : "text";

  const rawTags = manualTags.value.trim();
  const tags = rawTags
    ? rawTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : "#" + t))
    : [];

  const newPin = {
    id: "pin_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    type,
    content,
    sourceUrl: type === "link" || type === "image" ? content : "",
    pageTitle: type === "text" ? "Quick Note" : content,
    domain: "manual",
    favicon: "",
    createdAt: new Date().toISOString(),
    tags
  };

  const updatedPins = [newPin, ...allPins];
  await chrome.storage.local.set({ peened_pins: updatedPins });
  chrome.runtime.sendMessage({ action: "REFRESH_BADGE" });

  modalOverlay.style.display = "none";
  showToast("Pin added to moodboard!");
}

// Export Pins to JSON file
function exportPinsAsJson() {
  if (allPins.length === 0) {
    showToast("Nothing to export!");
    return;
  }

  const jsonStr = JSON.stringify(allPins, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const now = new Date().toISOString().split("T")[0];

  const a = document.createElement("a");
  a.href = url;
  a.download = `peened-moodboard-${now}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Exported " + allPins.length + " pins!");
}

// Toast notification inside side panel
let toastTimer = null;
function showToast(msg) {
  sidepanelToast.textContent = msg;
  sidepanelToast.style.display = "block";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    sidepanelToast.style.display = "none";
  }, 2200);
}

// Helper: Format Time Ago
function formatTimeAgo(isoDate) {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitize URL schemes to prevent javascript: or malformed URI injection
function sanitizeUrl(url) {
  if (!url) return "#";
  const trimmed = String(url).trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "chrome-extension:") {
      return trimmed;
    }
  } catch {
    if (trimmed.startsWith("data:image/")) return trimmed;
  }
  return "#";
}

// Global Image Error Handler for expired CDNs, 404s, or blocked hotlinks
window.handleImageError = function (imgEl, fallbackUrl) {
  const wrapper = imgEl.parentElement;
  if (!wrapper) return;
  wrapper.innerHTML = `
    <div class="pin-image-error">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
        <line x1="2" y1="2" x2="22" y2="22"></line>
      </svg>
      <span class="error-msg">Image preview unavailable</span>
      ${fallbackUrl && fallbackUrl !== "#" ? `<a href="${escapeHtml(fallbackUrl)}" target="_blank" rel="noopener noreferrer" class="error-link">Open original source</a>` : ""}
    </div>
  `;
};
