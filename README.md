# Ali Search Unlock

A lightweight Chrome extension (Manifest V3) that removes forced login popups on `alibaba.com` / `aliexpress.com` search & listing pages, including the Baxia risk-control iframe, and restores page scrolling.

## Features

- Auto-hide and remove login/signup popup nodes (CSS + JS dual approach)
- Auto-clear overlay/backdrop layers and restore page scroll
- `MutationObserver` continuously monitors SPA route changes and async popups
- Popup UI with one-click toggle and instant cleanup button
- `all_frames` support — covers iframes including `iframe#baxia-dialog-content`

## Install

### From Source (Developer Mode)

1. Download and unzip the [latest release](https://github.com/Project2er0/alibaba-no-login-popup/releases/latest)
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `alibaba-no-login-popup` folder

## File Structure

```
alibaba-no-login-popup/
├── manifest.json     # MV3 manifest
├── content.js        # Content script: detect & remove popups
├── content.css       # Fallback styles: hide known containers
├── popup.html        # Toolbar popup UI
├── popup.js          # Popup logic (toggle + instant cleanup)
├── icon.png          # Extension icon
└── README.md
```

## Customization

- Add popup class names: edit selectors at the top of `content.css` and `POPUP_CLASS_RE` in `content.js`
- Add login text patterns: edit `LOGIN_TEXT` regex in `content.js`
- Disable by default: change `let enabled = true` to `false` at the top of `content.js`

## What It Can vs Can't Do

This extension only removes DOM-level popups on the client side. It does not modify cookies, intercept requests, or bypass server-side authentication.

### ✅ Can Do

- Remove "Sign in or create account" intrusive login prompts on search/listing/home pages
- Remove Baxia risk-control login iframe (`iframe#baxia-dialog-content`)
- Fix `body { overflow: hidden }` scroll lock caused by popups

### ❌ Can't Do: Server-Side Auth (302 Redirect)

Some product detail pages return a **server-side 302 redirect** to `login.alibaba.com` for unauthenticated users. The browser never receives the page HTML — **no client-side extension can handle this**.

**How to verify:**

1. Copy a clean product URL (remove all query params)
2. Paste in a normal window → if redirected to login
3. Paste in an incognito window → if still redirected to login

If both redirect, it's server-side auth. Options:

| Option | Description |
|--------|-------------|
| **Log in** (recommended) | Alibaba is much more lenient with logged-in users — real prices, MOQ, contact info |
| **Google cache** | Search `site:alibaba.com "keyword"`, click cached (historical HTML only) |
| **Archive.org** | `https://web.archive.org/web/*/alibaba.com/product-detail/*keyword*` |
| **Official API / 3rd-party tools** | Use Alibaba OpenAPI or tools like Jungle Scout for bulk sourcing |

> ⚠️ Don't add complex logic to "trick" Alibaba — server-side redirects are independent of cookies/referer/URL changes, and may trigger stricter rate limiting or IP bans.

## License

MIT
