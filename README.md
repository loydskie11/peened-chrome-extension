# Peened

> **Pin anything, anywhere.** A frictionless, local-first Chrome extension to collect images, text snippets, and creative inspiration into a personal swipe file and moodboard right inside Chrome's Side Panel—no downloads, no accounts, zero friction.

---

## Features

### Capture on the Fly
- **Context Menu Capture**:
  - Highlight text $\rightarrow$ Right-click $\rightarrow$ **Pin text to Peened**
  - Right-click any image $\rightarrow$ **Pin image to Peened**
  - Right-click any link $\rightarrow$ **Pin link to Peened**
  - Right-click anywhere on a page $\rightarrow$ **Pin page to Peened**
- **Keyboard Shortcut**: Press `Alt+P` (or `Option+P` on macOS) on any webpage to instantly pin your selection or the current page without touching the mouse.
- **In-Page Quick Tag Toast**: A non-intrusive floating confirmation appears at the bottom-right for 4 seconds. Tap suggested tags (`#edit`, `#reference`, `#idea`, `#quote`) or type a custom tag without breaking your browsing momentum.
- **Smart Duplicate Detection**: Re-pinning an existing item automatically moves it to the top of your collection and refreshes its timestamp rather than creating duplicate cards.

### Native Side Panel Moodboard
- **Side-by-Side Creative Workflow**: Operates inside Chrome's native Side Panel (`chrome.sidePanel`), allowing you to keep your moodboard open beside **Canva, Figma, CapCut Web, Photoshop, Premiere, or Notion**.
- **HTML5 Drag & Drop**: Click and drag reference images directly from the Peened panel into external tabs and editing software.
- **Full-Resolution Lightbox**: Click any image card to open a full-resolution preview modal equipped with quick-copy and source links.
- **1-Click Clipboard Copy**:
  - Copies real image pixel data directly to your clipboard using background CORS bypass so you can paste (`Ctrl+V`) directly into design tools.
  - 1-click copy for text snippets and URLs.
- **Interactive Inline Tag Editor**: Manage tags directly on each card without interrupting your workflow.
- **Live Search & Filter**:
  - Instant debounced search across text content, tags, domains, and page titles.
  - Filter pills for quick isolation: `All`, `Images`, `Texts`, `Links`.
  - Dynamic Tag Cloud: Click any tag chip to filter matching references.
- **Manual Pin Creation**: Add custom notes, hex codes, or manual reference links via the `+` button.

### Privacy & Reliability
- **100% Local-First & Private**: All data is stored locally on your machine via `chrome.storage.local`. No sign-ups, no remote servers, and zero telemetry.
- **Offline Image Caching**: Images are cached locally as data URLs so your reference board remains intact even if original Twitter/X, Reddit, or Discord CDN links expire.
- **Full Backup Portability**: Export your collection to a pretty-printed `.json` backup or import existing backups across devices with one click.
- **Clean Aesthetic**: Modern dark-mode interface styled with **SF UI Display** typography and vector icons.

---

## Getting Started

### Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/loydskie11/peened-chrome-extension.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `peened` directory.
6. Click the puzzle icon on Chrome's toolbar and pin **Peened** for instant access!

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Alt+P` *(Windows / Linux)* | Pin current selection or active page | Global in Chrome |
| `Option+P` *(macOS)* | Pin current selection or active page | Global in Chrome |

> You can customize this shortcut anytime at `chrome://extensions/shortcuts`.

---

## Tech Stack

- **Platform**: Google Chrome Extension (Manifest V3)
- **APIs**: Chrome Context Menus, Chrome Storage Local (`unlimitedStorage`), Chrome Side Panel, Chrome Scripting, Chrome Commands
- **Frontend**: Vanilla JavaScript, Modern CSS (Responsive Flexbox & Custom Scrollbars)
- **Typography**: SF UI Display / SF Pro Display font stack

---

## Roadmap

- [x] Manifest V3 architecture & context menu actions
- [x] Local storage engine for text, images, and links
- [x] Native Chrome Side Panel moodboard interface
- [x] In-page quick tag toast notification
- [x] 1-click clipboard copy with CORS bypass
- [x] Full JSON export and import
- [x] Offline image caching for ephemeral CDN links
- [x] Smart duplicate pin detection
- [x] HTML5 drag-and-drop into external design apps
- [x] Full-resolution image lightbox modal
- [x] Inline card tag editing
- [x] Global keyboard shortcut (`Alt+P`)
- [x] Performance debouncing and scroll container hardening

---

## License

MIT License. See [LICENSE](LICENSE) for details.
