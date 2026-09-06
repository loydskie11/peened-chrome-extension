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
      title: "?? Pin text to Peened",
      contexts: ["selection"]
    });

    // 2. Images
    chrome.contextMenus.create({
      id: "peened-pin-image",
      title: "?? Pin image to Peened",
      contexts: ["image"]
    });

    // 3. Links
    chrome.contextMenus.create({
      id: "peened-pin-link",
      title: "?? Pin link to Peened",
      contexts: ["link"]
    });

    // 4. Entire Page
    chrome.contextMenus.create({
      id: "peened-pin-page",
      title: "?? Pin page to Peened",
      contexts: ["page"]
    });
  });

  // Initialize badge count
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
    // Save to chrome storage
    const storage = await chrome.storage.local.get({ peened_pins: [] });
    const updatedPins = [newPin, ...storage.peened_pins];
    await chrome.storage.local.set({ peened_pins: updatedPins });

    await updateBadgeCount();

    // Send toast notification to content script in the active tab
    if (tab.id) {
      chrome.tabs.sendMessage(
        tab.id,
        { action: "PEENED_SHOW_TOAST", pin: newPin },
        () => {
          if (chrome.runtime.lastError) {
            // Tab may not support content scripts (e.g. chrome:// or webstore)
          }
        }
      );
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
});
