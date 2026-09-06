# Peened

> **Pin anything, anywhere.** A frictionless Chrome extension to collect images, text snippets, and creative inspiration into your personal swipe file without downloading or losing context.

---

## Features

- **One-Click Capture**:
  - Highlight any text $\rightarrow$ Right-click $\rightarrow$ **Pin to Peened**
  - Right-click any image $\rightarrow$ **Pin to Peened**
- **Automatic Provenance & Metadata**: Every pin automatically records the source URL, page title, domain, and timestamp so you can always trace back to original posts and threads.
- **Side Panel Moodboard**: Access your pins side-by-side with your creative tools (Canva, Figma, video editors, etc.) using Chrome's native Side Panel.
- **Privacy & Local First**: All your data is saved locally on your machine via chrome.storage.local. No account or remote server required.
- **Easy Export**: Export your inspiration boards whenever you want.

---

## Getting Started

### Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/loydskie11/peened-chrome-extension.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the `peened` directory.
5. Pin the **Peened** icon to your Chrome toolbar for quick access!

---

## Tech Stack

- **Platform**: Google Chrome Extension (Manifest V3)
- **APIs**: Chrome Context Menus, Chrome Storage, Chrome Side Panel
- **Frontend**: Vanilla JavaScript / Modern CSS

---

## Roadmap

- [x] Initial Manifest V3 setup & context menu actions
- [x] Local storage engine for text & image clips
- [x] Side Panel moodboard interface
- [x] Quick tag toast on capture (`#edit`, `#idea`, `#reference`)
- [x] 1-click clipboard copy (image/text)
- [x] JSON backup and export

---

## License

MIT License. See [LICENSE](LICENSE) for details.
