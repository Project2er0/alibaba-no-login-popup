const KEY = "ali_nopop_enabled";
const cb = document.getElementById("enabled");
const btn = document.getElementById("clean");

chrome.storage.sync.get([KEY], (res) => {
  cb.checked = res && Object.prototype.hasOwnProperty.call(res, KEY) ? !!res[KEY] : true;
});

cb.addEventListener("change", () => {
  chrome.storage.sync.set({ [KEY]: cb.checked });
});

btn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => {
      const KILL_CLS = /(login|signin|sign-in|loginGuide|forceLogin|LoginPopup|signin-mask|mask|overlay|backdrop|baxia)/i;
      const LOGIN_TEXT = /(sign in or create account|sign in to view|登录后查看|登录后继续|登录或注册|请登录)/i;
      // baxia 风控登录 iframe
      document.querySelectorAll('iframe#baxia-dialog-content, iframe[src*="login.alibaba.com/mini_login.htm" i], iframe[src*="passport.alibaba.com" i], #baxia-dialog, #baxia-dialog-mask, [id^="baxia-"], [class^="baxia-"]').forEach((n) => n.remove());
      document.querySelectorAll('div[role="dialog"], div[class*="dialog"], div[class*="popup"], div[class*="Modal"], div[class*="modal"]').forEach((n) => {
        const txt = (n.innerText || "").slice(0, 400);
        if (LOGIN_TEXT.test(txt) || KILL_CLS.test(n.className || "")) n.remove();
      });
      document.querySelectorAll('div[class*="mask" i], div[class*="overlay" i], div[class*="backdrop" i]').forEach((n) => {
        const cs = getComputedStyle(n);
        if (cs.position === "fixed" && n.offsetWidth >= innerWidth * 0.8) n.remove();
      });
      for (const el of [document.documentElement, document.body]) {
        el.classList.remove("next-dialog-open", "next-overlay-open", "no-scroll", "modal-open", "overflow-hidden");
        if (el.style.overflow === "hidden") el.style.overflow = "";
        if (el.style.position === "fixed") el.style.position = "";
      }
    },
  });
  window.close();
});
