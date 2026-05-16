/* Alibaba No Login Popup - content script
 * 思路：
 *   1) CSS 已经把已知容器隐藏 + 解锁滚动；
 *   2) JS 用 MutationObserver 持续扫描，识别并移除「登录/注册」相关弹窗节点，
 *      同时清理 body/html 上锁滚动的 class 和 inline style；
 *   3) 关键文案匹配 + 类名/属性匹配双保险，应对 SPA 动态渲染。
 */

(() => {
  const ENABLED_KEY = "ali_nopop_enabled";

  // 默认启用；用户可以从弹窗里关掉
  let enabled = true;
  try {
    chrome.storage?.sync?.get?.([ENABLED_KEY], (res) => {
      if (res && Object.prototype.hasOwnProperty.call(res, ENABLED_KEY)) {
        enabled = !!res[ENABLED_KEY];
        if (!enabled) document.documentElement.classList.add("ali-nopop-disabled");
      }
    });
    chrome.storage?.onChanged?.addListener?.((changes, area) => {
      if (area === "sync" && changes[ENABLED_KEY]) {
        enabled = !!changes[ENABLED_KEY].newValue;
        document.documentElement.classList.toggle("ali-nopop-disabled", !enabled);
      }
    });
  } catch (_) {}

  // ---------------- 1. 工具：解锁滚动 ----------------
  const SCROLL_LOCK_CLASSES = [
    "next-dialog-open",
    "next-overlay-open",
    "no-scroll",
    "modal-open",
    "overflow-hidden",
  ];

  function unlockScroll() {
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      for (const cls of SCROLL_LOCK_CLASSES) el.classList.remove(cls);
      const s = el.style;
      if (s) {
        if (s.overflow === "hidden") s.overflow = "";
        if (s.position === "fixed") s.position = "";
        if (s.paddingRight) s.paddingRight = "";
        if (s.top && /^-?\d+px$/.test(s.top)) s.top = "";
      }
    }
  }

  // ---------------- 2. 弹窗识别 ----------------
  const LOGIN_TEXT = /(sign in or create account|sign in to view|please sign in|登录后查看|登录后继续|登录或注册|登录查看|请登录|登录账户)/i;
  const POPUP_CLASS_RE = /(login|signin|sign-in|loginGuide|login-dialog|forceLogin|LoginPopup|login-popup|signin-mask|baxia)/i;

  function isLoginPopup(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node === document.body || node === document.documentElement) return false;

    const cls = (node.className && typeof node.className === "string") ? node.className : "";
    const id = node.id || "";
    if (POPUP_CLASS_RE.test(cls) || POPUP_CLASS_RE.test(id)) {
      const cs = getComputedStyle(node);
      if (cs.position === "fixed" || cs.position === "absolute" || node.getAttribute("role") === "dialog") {
        return true;
      }
    }

    if (node.getAttribute && node.getAttribute("role") === "dialog") {
      const txt = (node.innerText || "").slice(0, 400);
      if (LOGIN_TEXT.test(txt)) return true;
    }
    return false;
  }

  function isBackdrop(node) {
    if (!node || node.nodeType !== 1) return false;
    const cls = (node.className && typeof node.className === "string") ? node.className : "";
    if (!/(mask|overlay|backdrop|modal-bg)/i.test(cls)) return false;
    const cs = getComputedStyle(node);
    if (cs.position !== "fixed") return false;
    const w = node.offsetWidth, h = node.offsetHeight;
    return w >= window.innerWidth * 0.8 && h >= window.innerHeight * 0.6;
  }

  function killNode(node, reason) {
    try {
      node.style.setProperty("display", "none", "important");
      node.setAttribute("data-ali-nopop-killed", reason || "1");
      node.remove?.();
    } catch (_) {}
  }

  // ---------------- 3. 扫描 ----------------
  function killBaxia(root = document) {
    const sels = [
      "iframe#baxia-dialog-content",
      'iframe[src*="login.alibaba.com/mini_login.htm" i]',
      'iframe[src*="passport.alibaba.com" i]',
      'iframe[src*="login.aliexpress.com" i]',
      "#baxia-dialog",
      "#baxia-dialog-mask",
      '[id^="baxia-"]',
      '[class^="baxia-"]',
      '[class*=" baxia-"]',
    ];
    for (const sel of sels) {
      root.querySelectorAll(sel).forEach((n) => killNode(n, "baxia"));
    }
  }

  function scanAll(root = document) {
    if (!enabled) return;
    unlockScroll();
    killBaxia(root);

    const candidates = root.querySelectorAll(
      'div[role="dialog"], div[class*="dialog"], div[class*="Dialog"], ' +
      'div[class*="popup"], div[class*="Popup"], div[class*="Modal"], div[class*="modal"], ' +
      'div[class*="login" i], div[class*="signin" i], div[class*="sign-in" i]'
    );
    for (const n of candidates) {
      if (isLoginPopup(n)) killNode(n, "popup");
    }

    const overlays = root.querySelectorAll(
      'div[class*="mask" i], div[class*="overlay" i], div[class*="backdrop" i], div[class*="modal-bg" i]'
    );
    for (const n of overlays) {
      if (isBackdrop(n)) killNode(n, "backdrop");
    }
  }

  // ---------------- 4. 监听 DOM ----------------
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scanAll();
    });
  }

  const mo = new MutationObserver((muts) => {
    if (!enabled) return;
    for (const m of muts) {
      if (m.addedNodes && m.addedNodes.length) {
        schedule();
        break;
      }
      if (m.type === "attributes" && (m.attributeName === "class" || m.attributeName === "style")) {
        schedule();
      }
    }
  });

  function startObserver() {
    if (!document.documentElement) return;
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  // 定时兜底（首屏延迟弹出 / iframe 切路由）
  let ticks = 0;
  const iv = setInterval(() => {
    if (!enabled) return;
    schedule();
    ticks++;
    if (ticks > 60) clearInterval(iv);
  }, 500);

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") schedule();
    },
    true
  );
})();
