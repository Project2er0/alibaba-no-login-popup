// ==UserScript==
// @name         Ali Search Unlock
// @namespace    https://github.com/Project2er0/alibaba-no-login-popup
// @version      1.0.0
// @description  Remove forced login popups on Alibaba/AliExpress search pages, including Baxia risk-control iframe. Restore page scrolling.
// @author       Project2er0
// @match        *://*.alibaba.com/*
// @match        *://*.aliexpress.com/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ---------- Config ----------
  const ENABLED_KEY = 'ali_search_unlock_enabled';
  let enabled = GM_getValue(ENABLED_KEY, true);

  // ---------- CSS (inject at document-start) ----------
  GM_addStyle(`
    /* baxia risk-control iframe */
    iframe#baxia-dialog-content,
    iframe[src*="login.alibaba.com/mini_login.htm" i],
    iframe[src*="passport.alibaba.com" i],
    iframe[src*="login.aliexpress.com" i],
    #baxia-dialog,
    #baxia-dialog-mask,
    div[id^="baxia-"],
    div[class^="baxia-"],
    div[class*=" baxia-"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    /* login popup containers */
    .ali-react-modal-mask,
    .next-overlay-wrapper.opened.next-overlay-inner,
    .next-dialog-container[role="dialog"][aria-label*="Sign" i],
    div[class*="login-dialog"],
    div[class*="LoginDialog"],
    div[class*="sign-in-dialog"],
    div[class*="SignInDialog"],
    div[class*="forceLoginDialog"],
    div[class*="ForceLoginDialog"],
    div[id*="login-dialog" i],
    div[data-spm*="login" i][role="dialog"],
    div[class*="login-popup"],
    div[class*="LoginPopup"],
    div[class*="loginGuide"],
    div[class*="LoginGuide"],
    div[class*="signin-mask"],
    div[class*="SigninMask"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* overlay / backdrop */
    .next-overlay-backdrop,
    .ali-react-modal-mask,
    div[class*="mask"][class*="login" i],
    div[class*="Mask"][class*="Login" i],
    div[class*="overlay"][class*="login" i],
    div[class*="Overlay"][class*="Login" i] {
      display: none !important;
      pointer-events: none !important;
      background: transparent !important;
    }

    /* unlock scroll */
    html.next-dialog-open,
    body.next-dialog-open,
    html.next-overlay-open,
    body.next-overlay-open,
    body[style*="overflow: hidden"],
    body[style*="overflow:hidden"],
    html[style*="overflow: hidden"],
    html[style*="overflow:hidden"] {
      overflow: auto !important;
      position: static !important;
      padding-right: 0 !important;
    }
  `);

  // ---------- Menu toggle ----------
  function updateMenu() {
    GM_registerMenuCommand(enabled ? '🔴 Disable Ali Search Unlock' : '🟢 Enable Ali Search Unlock', () => {
      enabled = !enabled;
      GM_setValue(ENABLED_KEY, enabled);
      if (enabled) schedule();
      location.reload();
    });
  }
  updateMenu();

  // ---------- Scroll unlock ----------
  const SCROLL_LOCK_CLASSES = [
    'next-dialog-open', 'next-overlay-open', 'no-scroll', 'modal-open', 'overflow-hidden',
  ];

  function unlockScroll() {
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      for (const cls of SCROLL_LOCK_CLASSES) el.classList.remove(cls);
      const s = el.style;
      if (s) {
        if (s.overflow === 'hidden') s.overflow = '';
        if (s.position === 'fixed') s.position = '';
        if (s.paddingRight) s.paddingRight = '';
        if (s.top && /^-?\d+px$/.test(s.top)) s.top = '';
      }
    }
  }

  // ---------- Popup detection ----------
  const LOGIN_TEXT = /(sign in or create account|sign in to view|please sign in|登录后查看|登录后继续|登录或注册|登录查看|请登录|登录账户)/i;
  const POPUP_CLASS_RE = /(login|signin|sign-in|loginGuide|login-dialog|forceLogin|LoginPopup|login-popup|signin-mask|baxia)/i;

  function isLoginPopup(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node === document.body || node === document.documentElement) return false;
    const cls = (node.className && typeof node.className === 'string') ? node.className : '';
    const id = node.id || '';
    if (POPUP_CLASS_RE.test(cls) || POPUP_CLASS_RE.test(id)) {
      const cs = getComputedStyle(node);
      if (cs.position === 'fixed' || cs.position === 'absolute' || node.getAttribute('role') === 'dialog') return true;
    }
    if (node.getAttribute && node.getAttribute('role') === 'dialog') {
      const txt = (node.innerText || '').slice(0, 400);
      if (LOGIN_TEXT.test(txt)) return true;
    }
    return false;
  }

  function isBackdrop(node) {
    if (!node || node.nodeType !== 1) return false;
    const cls = (node.className && typeof node.className === 'string') ? node.className : '';
    if (!/(mask|overlay|backdrop|modal-bg)/i.test(cls)) return false;
    const cs = getComputedStyle(node);
    if (cs.position !== 'fixed') return false;
    return node.offsetWidth >= window.innerWidth * 0.8 && node.offsetHeight >= window.innerHeight * 0.6;
  }

  function killNode(node) {
    try {
      node.style.setProperty('display', 'none', 'important');
      node.remove?.();
    } catch (_) {}
  }

  // ---------- Scan ----------
  function killBaxia(root = document) {
    const sels = [
      'iframe#baxia-dialog-content',
      'iframe[src*="login.alibaba.com/mini_login.htm" i]',
      'iframe[src*="passport.alibaba.com" i]',
      'iframe[src*="login.aliexpress.com" i]',
      '#baxia-dialog', '#baxia-dialog-mask',
      '[id^="baxia-"]', '[class^="baxia-"]', '[class*=" baxia-"]',
    ];
    for (const sel of sels) root.querySelectorAll(sel).forEach(killNode);
  }

  function scanAll(root = document) {
    if (!enabled) return;
    unlockScroll();
    killBaxia(root);
    root.querySelectorAll(
      'div[role="dialog"], div[class*="dialog"], div[class*="Dialog"], ' +
      'div[class*="popup"], div[class*="Popup"], div[class*="Modal"], div[class*="modal"], ' +
      'div[class*="login" i], div[class*="signin" i], div[class*="sign-in" i]'
    ).forEach(n => { if (isLoginPopup(n)) killNode(n); });

    root.querySelectorAll(
      'div[class*="mask" i], div[class*="overlay" i], div[class*="backdrop" i], div[class*="modal-bg" i]'
    ).forEach(n => { if (isBackdrop(n)) killNode(n); });
  }

  // ---------- Observer ----------
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scanAll(); });
  }

  function startObserver() {
    if (!document.documentElement) return;
    new MutationObserver(muts => {
      if (!enabled) return;
      for (const m of muts) {
        if (m.addedNodes?.length) { schedule(); break; }
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) schedule();
      }
    }).observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'],
    });
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

  // fallback timer
  let ticks = 0;
  const iv = setInterval(() => {
    if (!enabled) return;
    schedule();
    if (++ticks > 60) clearInterval(iv);
  }, 500);

  window.addEventListener('keydown', e => { if (e.key === 'Escape') schedule(); }, true);
})();
