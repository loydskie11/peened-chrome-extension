// Peened Background Service Worker (Manifest V3)

// Enable Side Panel on toolbar icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting side panel behavior:", error));

// Setup Context Menus on Installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // 1. Highlighted Text
    chrome.contextMenus.create({
      id: "peened-pin-selection",
      title: "Pin text to Peened",
      contexts: ["selection"]
    });

    // 2. Images
    chrome.contextMenus.create({
      id: "peened-pin-image",
      title: "Pin image to Peened",
      contexts: ["image"]
    });

    // 3. Links
    chrome.contextMenus.create({
      id: "peened-pin-link",
      title: "Pin link to Peened",
      contexts: ["link"]
    });

    // 4. Entire Page
    chrome.contextMenus.create({
      id: "peened-pin-page",
      title: "Pin page to Peened",
      contexts: ["page"]
    });
  });

  // Initialize badge count
  updateBadgeCount();
});

// Sync badge count when browser starts up
chrome.runtime.onStartup.addListener(() => {
  updateBadgeCount();
});

// Helper: Format domain name
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Flash Confirmation on Badge
function flashBadgeSuccess() {
  chrome.action.setBadgeText({ text: "+1" });
  chrome.action.setBadgeBackgroundColor({ color: "#10B981" });
  setTimeout(() => {
    updateBadgeCount();
  }, 1200);
}

// Update Extension Icon Badge Count
async function updateBadgeCount() {
  try {
    const data = await chrome.storage.local.get({ peened_pins: [] });
    const count = data.peened_pins.length;
    const text = count > 0 ? (count > 99 ? "99+" : String(count)) : "";
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#F43F5E" });
  } catch (err) {
    console.error("Error updating badge count:", err);
  }
}

// Fetch image and convert to data URL for offline caching (under 2MB)
async function cacheImageAsDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > 2 * 1024 * 1024) return null; // Keep under 2MB
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not cache image locally:", err);
    return null;
  }
}

// Save Pin with Deduplication & Offline Image Caching
async function saveOrUpdatePin(newPin, tab) {
  const storage = await chrome.storage.local.get({ peened_pins: [] });
  let pins = storage.peened_pins || [];

  const existingIdx = pins.findIndex(
    (p) => p.content.trim() === newPin.content.trim()
  );
  let isDuplicate = false;
  let finalPin = newPin;

  if (existingIdx !== -1) {
    // Move existing pin to the top and refresh timestamp
    isDuplicate = true;
    const [existing] = pins.splice(existingIdx, 1);
    finalPin = {
      ...existing,
      createdAt: newPin.createdAt,
      sourceUrl: newPin.sourceUrl || existing.sourceUrl,
      pageTitle: newPin.pageTitle || existing.pageTitle
    };
    pins.unshift(finalPin);
  } else {
    // If it's an image, attempt local offline caching
    if (newPin.type === "image") {
      const cached = await cacheImageAsDataUrl(newPin.content);
      if (cached) {
        newPin.cachedDataUrl = cached;
      }
    }
    pins.unshift(newPin);
  }

  await chrome.storage.local.set({ peened_pins: pins });
  flashBadgeSuccess();

  if (tab && tab.id) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "PEENED_SHOW_TOAST", pin: finalPin, isDuplicate },
      () => {
        if (chrome.runtime.lastError) {
          // Tab does not support content scripts
        }
      }
    );
  }
}

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;

  const id = "pin_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const sourceUrl = tab.url || info.pageUrl || "";
  const pageTitle = tab.title || "Untitled Reference";
  const domain = extractDomain(sourceUrl);
  const favicon = tab.favIconUrl || "";

  let newPin = null;

  if (info.menuItemId === "peened-pin-selection" && info.selectionText) {
    newPin = {
      id,
      type: "text",
      content: info.selectionText.trim(),
      sourceUrl,
      pageTitle,
      domain,
      favicon,
      createdAt: now,
      tags: []
    };
  } else if (info.menuItemId === "peened-pin-image" && info.srcUrl) {
    newPin = {
      id,
      type: "image",
      content: info.srcUrl,
      sourceUrl,
      pageTitle,
      domain,
      favicon,
      createdAt: now,
      tags: []
    };
  } else if (info.menuItemId === "peened-pin-link" && info.linkUrl) {
    newPin = {
      id,
      type: "link",
      content: info.linkUrl,
      sourceUrl: info.linkUrl,
      pageTitle: info.selectionText || info.linkUrl,
      domain: extractDomain(info.linkUrl),
      favicon,
      createdAt: now,
      tags: []
    };
  } else if (info.menuItemId === "peened-pin-page") {
    newPin = {
      id,
      type: "page",
      content: sourceUrl,
      sourceUrl,
      pageTitle,
      domain,
      favicon,
      createdAt: now,
      tags: []
    };
  }

  if (newPin) {
    await saveOrUpdatePin(newPin, tab);
  }
});

// Keyboard Shortcut Command Listener (Alt+P)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "pin-current-selection") {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) return;

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => window.getSelection().toString()
      });

      const selectedText = result && result.result ? result.result.trim() : "";
      const id = "pin_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const now = new Date().toISOString();
      const sourceUrl = activeTab.url || "";
      const pageTitle = activeTab.title || "Pinned Item";
      const domain = extractDomain(sourceUrl);
      const favicon = activeTab.favIconUrl || "";

      let newPin;
      if (selectedText) {
        newPin = {
          id,
          type: "text",
          content: selectedText,
          sourceUrl,
          pageTitle,
          domain,
          favicon,
          createdAt: now,
          tags: []
        };
      } else {
        newPin = {
          id,
          type: "page",
          content: sourceUrl,
          sourceUrl,
          pageTitle,
          domain,
          favicon,
          createdAt: now,
          tags: []
        };
      }
      await saveOrUpdatePin(newPin, activeTab);
    } catch (err) {
      console.warn("Could not pin via shortcut:", err);
    }
  }
});

// Listen for messages from content script or side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "UPDATE_PIN_TAGS") {
    chrome.storage.local.get({ peened_pins: [] }).then(async (data) => {
      const pins = data.peened_pins.map((pin) => {
        if (pin.id === message.pinId) {
          return { ...pin, tags: message.tags };
        }
        return pin;
      });
      await chrome.storage.local.set({ peened_pins: pins });
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }

  if (message.action === "REFRESH_BADGE") {
    updateBadgeCount().then(() => sendResponse({ success: true }));
    return true;
  }

  // Background CORS image fetch for Side Panel clipboard copy
  if (message.action === "FETCH_IMAGE_DATA") {
    fetch(message.url)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ success: true, dataUrl: reader.result, mimeType: blob.type || "image/png" });
        };
        reader.onerror = () => sendResponse({ success: false, error: "Read error" });
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});
