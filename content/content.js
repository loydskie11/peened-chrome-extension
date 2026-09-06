// Peened Content Script - In-Page Feedback & Quick Tagging

let lastRightClickedElement = null;

// Track last right-clicked element for fallback element/image detection
document.addEventListener(
  "contextmenu",
  (e) => {
    lastRightClickedElement = e.target;
  },
  true
);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "PEENED_SHOW_TOAST" && request.pin) {
    showPeenedToast(request.pin);
    sendResponse({ received: true });
  }
});

// Toast Manager
function showPeenedToast(pin) {
  let container = document.getElementById("peened-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "peened-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "peened-toast";

  const selectedTags = new Set(pin.tags || []);
  const suggestedTags = ["#edit", "#reference", "#idea", "#quote"];

  // Prepare Body Preview
  let bodyContent = "";
  if (pin.type === "image") {
    bodyContent = `
      <img src="${escapeHtml(pin.content)}" class="peened-toast-thumb" alt="Preview" onerror="this.style.display='none'" />
      <span class="peened-toast-snippet">Image pinned from ${escapeHtml(pin.domain || "web")}</span>
    `;
  } else if (pin.type === "text") {
    bodyContent = `
      <span style="font-size:16px;">??</span>
      <span class="peened-toast-snippet">"${escapeHtml(pin.content)}"</span>
    `;
  } else {
    bodyContent = `
      <span style="font-size:16px;">??</span>
      <span class="peened-toast-snippet">${escapeHtml(pin.pageTitle || pin.content)}</span>
    `;
  }

  toast.innerHTML = `
    <div class="peened-toast-header">
      <div class="peened-toast-title">
        <span>??</span>
        <span>Saved to Peened</span>
        <span class="peened-toast-badge">${pin.type}</span>
      </div>
      <button class="peened-toast-close" title="Dismiss">&times;</button>
    </div>
    <div class="peened-toast-body">
      ${bodyContent}
    </div>
    <div class="peened-toast-tags">
      <span class="peened-toast-tag-label">Tags:</span>
      ${suggestedTags
        .map(
          (tag) =>
            `<span class="peened-tag-chip" data-tag="${tag}">${tag}</span>`
        )
        .join("")}
      <input type="text" class="peened-tag-input" placeholder="+ tag" maxlength="20" />
    </div>
  `;

  container.appendChild(toast);

  // Auto-dismiss timer (4s)
  let dismissTimeout = null;
  const startDismissTimer = () => {
    dismissTimeout = setTimeout(() => {
      dismissToast(toast);
    }, 4000);
  };

  const cancelDismissTimer = () => {
    if (dismissTimeout) clearTimeout(dismissTimeout);
  };

  startDismissTimer();

  // Pause timer on hover
  toast.addEventListener("mouseenter", cancelDismissTimer);
  toast.addEventListener("mouseleave", startDismissTimer);

  // Close Button
  const closeBtn = toast.querySelector(".peened-toast-close");
  closeBtn.addEventListener("click", () => dismissToast(toast));

  // Tag Chips Clicking
  const chips = toast.querySelectorAll(".peened-tag-chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tag = chip.getAttribute("data-tag");
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        chip.classList.remove("active");
      } else {
        selectedTags.add(tag);
        chip.classList.add("active");
      }
      updatePinTags(pin.id, Array.from(selectedTags));
    });
  });

  // Custom Tag Input
  const tagInput = toast.querySelector(".peened-tag-input");
  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      let customTag = tagInput.value.trim();
      if (customTag) {
        if (!customTag.startsWith("#")) customTag = "#" + customTag;
        selectedTags.add(customTag);

        // Create chip element
        const newChip = document.createElement("span");
        newChip.className = "peened-tag-chip active";
        newChip.textContent = customTag;
        newChip.setAttribute("data-tag", customTag);
        newChip.addEventListener("click", () => {
          selectedTags.delete(customTag);
          newChip.remove();
          updatePinTags(pin.id, Array.from(selectedTags));
        });

        tagInput.before(newChip);
        tagInput.value = "";
        updatePinTags(pin.id, Array.from(selectedTags));
      }
    }
  });
}

function dismissToast(toast) {
  toast.classList.add("peened-hiding");
  setTimeout(() => {
    toast.remove();
  }, 300);
}

function updatePinTags(pinId, tags) {
  chrome.runtime.sendMessage({
    action: "UPDATE_PIN_TAGS",
    pinId: pinId,
    tags: tags
  });
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
