// SPDX-License-Identifier: GPL-3.0-or-later
// providers/meta.js - the Meta AI (www.meta.ai) provider.
// (Header comments unchanged from your original file.)
// eslint-disable-next-line no-unused-vars
const ZSProvider = (() => {
  "use strict";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let diag = () => {};
  let _attachedImages = null;
  let _locked = false;

  const S = {
    asst: '[data-testid="assistant-message"]',
    input: [
      '[data-testid="composer-input"]',
      'input[aria-label="Ask Meta AI"]',
      'textarea[aria-label="Ask Meta AI"]',
      'input[placeholder*="Meta AI"]',
      'textarea[placeholder*="Meta AI"]',
      '[contenteditable="true"][role="textbox"]',
    ].join(","),
    sendBtn: [
      '[data-testid="composer-send-button"]',
      'button[aria-label="Send"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Envoyer"]',
      'button[aria-label="Envoyer le message"]',
    ].join(","),
    stopBtn: [
      '[data-testid="composer-stop-button"]',
      'button[aria-label*="Stop"]',
      'button[aria-label*="stop"]',
      'button[aria-label*="Arrêter"]',
      'button[aria-label*="arrêter"]',
    ].join(","),
    newChat: '[data-testid="new-chat-button"]',
    modeBtn: '[data-testid="composer-mode-dropdown-button"]',
    modeOptHard: '[data-testid="composer-mode-option-think_hard"]',
    reasoning: '[data-testid="thinking-status"],[data-testid="subagent-cot-list"]',
    codeWrap: ".ur-code-block",
    errorSurfaces:
      '[role="alert"],[class*="toast"],[class*="error"],[class*="alert"]',
  };

  const RE = {
    contextLimit: new RegExp(
      [
        "conversation.{0,20}(too long|trop long)",
        "context.{0,20}(limit|exceeded|d\\u00e9pass\\u00e9)",
        "please.{0,30}(start|cr\\u00e9er).{0,20}(new|nouveau).{0,20}(chat|conversation)",
        "(token|context).{0,10}limit",
        "maximum.{0,20}context",
        "this conversation has reached",
      ].join("|"),
      "i"
    ),
    tooLong: /conversation .{0,20}(too long|getting too long|trop longue)/i,
    busy: /something went wrong|une erreur s.est produite|try again later|réessayer plus tard|rate limit|too many requests|trop de requ[êe]tes/i,
  };

  const timings = {
    GEN_IDLE_MS: 1500,
    REASON_IDLE_MS: 12000,
    WARMUP_MS: 45000,
    REASON_NOREPLY_MS: 90000,
    STABLE_MS: 9000,
    RESPONSE_TIMEOUT_MS: 300000,
  };

  function listEl() {
    const any = document.querySelector(S.asst);
    if (!any) return null;
    let n = any.parentElement;
    for (let i = 0; i < 12 && n; i++, n = n.parentElement) {
      if (
        n.classList.contains("flex") &&
        n.classList.contains("flex-col") &&
        n.children.length >= 2 &&
        n.querySelector(S.asst)
      ) {
        return n;
      }
    }
    return null;
  }

  function isTurnChild(c) {
    if (!c) return false;
    if (c.classList.contains("pointer-events-none") && c.classList.contains("absolute")) return false;
    return !!c.querySelector(S.asst) || (c.textContent || "").trim().length > 0;
  }
  function domTurns() {
    const list = listEl();
    if (!list) return [];
    return [...list.children].filter(isTurnChild);
  }

  const isAssistantItem = (item) => !!item && !!item.querySelector(S.asst);
  const isUserItem = (item) => !!item && !isAssistantItem(item);

  function bodyOf(item) {
    if (!item) return null;
    return isAssistantItem(item) ? item.querySelector(S.asst) : item;
  }

  const allItems = () => domTurns();
  const assistantItems = () => allItems().filter(isAssistantItem);
  const assistantCount = () => assistantItems().length;
  const userCount = () => allItems().filter(isUserItem).length;
  const lastAssistant = () => {
    const it = assistantItems();
    return it.length ? it[it.length - 1] : null;
  };

  const _idMap = new WeakMap();
  let _idSeq = 0;
  function lastAssistantId() {
    const it = lastAssistant();
    if (!it) return null;
    let id = _idMap.get(it);
    if (!id) { id = ++_idSeq; _idMap.set(it, id); }
    return id;
  }

  const chatIsEmpty = () => allItems().length === 0;

  function textWithout(root, excludeSel) {
    if (!root) return "";
    const skip = ".zs-chip, " + S.reasoning + (excludeSel ? ", " + excludeSel : "");
    let t = "";
    const walk = (n) => {
      if (n.nodeType === 3) { t += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      if (n.matches && n.matches(skip)) return;
      if (n.matches && n.matches(S.codeWrap) && !n.querySelector("pre")) {
        ensureRawView(n);
        t += cleanJsonViewer(n.textContent || "");
        return;
      }
      if (n.tagName === "PRE") { t += preText(n); return; }
      for (const c of n.childNodes) walk(c);
    };
    walk(root);
    return t;
  }
  const _rawSwitched = new WeakSet();
  function ensureRawView(wrap) {
    try {
      if (_rawSwitched.has(wrap)) return;
      const txt = wrap.textContent || "";
      if (!/"(?:command|tool)"\s*:/.test(txt)) return;
      const btn = [...wrap.querySelectorAll('button,[role="tab"]')].find(
        (b) => (b.textContent || "").trim().toLowerCase() === "raw"
      );
      if (!btn) return;
      _rawSwitched.add(wrap);
      btn.click();
      diag("meta.jsonviewer.raw", { len: txt.length });
    } catch {}
  }
  function cleanJsonViewer(text) {
    const t = text.replace(/[▲▴▶▸►▼▾◀◂]/g, "");
    const i = t.indexOf("{");
    return i > 0 ? t.slice(i) : t;
  }
  function preText(pre) {
    const code = pre.querySelector("code") || pre;
    const lines = [...code.children].filter((c) => c.nodeType === 1);
    if (lines.length) return lines.map((l) => l.textContent).join("\n");
    return code.textContent || "";
  }

  function itemText(item) {
    const b = bodyOf(item);
    return b ? textWithout(b) : "";
  }
  function classifyText(item, excludeSel) {
    const b = bodyOf(item);
    if (!b) return "";
    return textWithout(b, excludeSel);
  }

  function chipAnchor(item) {
    const body = bodyOf(item);
    if (!body) return item;
    const col = [...body.querySelectorAll("div")].find((e) => {
      const c = e.className || "";
      return /mx-auto/.test(c) && /max-w-/.test(c) && /flex-col/.test(c) && !/actions/.test(c);
    });
    return col || body;
  }

  const editorEls = () => [...document.querySelectorAll(S.input)].filter((e) =>
    !e.closest("#zs-root") && !e.closest('[data-testid="user-message"],[data-testid="assistant-message"]')
  );
  const isValueEditor = (e) => !!e && (e.tagName === "TEXTAREA" || e.tagName === "INPUT");
  const getEditor = () => {
    const all = editorEls();
    return all.find((e) => !isValueEditor(e) && e.getClientRects().length > 0) ||
           all.find((e) => e.getClientRects().length > 0) || all[0] || null;
  };
  const visibleEditor = getEditor;
  const writeEl = () => editorEls().find((e) => e.tagName === "TEXTAREA") ||
    editorEls().find((e) => e.tagName === "INPUT") || getEditor();
  const editorText = () => {
    const e = writeEl();
    if (!e) return "";
    return isValueEditor(e) ? (e.value || "") : (e.textContent || "");
  };
  const composerFrame = () => barAnchor() || (visibleEditor() && visibleEditor().parentElement) || null;

  const isFreshChat = () => chatIsEmpty() && location.pathname === "/" && !!getEditor();

  function barAnchor() {
    const ed = visibleEditor();
    if (!ed) return null;
    let n = ed;
    for (let i = 0; i < 10 && n; i++, n = n.parentElement) {
      if ([...n.classList].some((c) => c.startsWith("rounded"))) return n;
    }
    return (ed && ed.parentElement) || null;
  }

  function coverTarget() {
    const card = barAnchor();
    const ed = getEditor();
    if (!card || !ed) return ed;
    let n = ed;
    while (n && n.parentElement && n.parentElement !== card) n = n.parentElement;
    return (n && n.parentElement === card) ? n : ed;
  }

  function setInputLock(on) {
    _locked = on;
    applyLock();
  }
  function applyLock() {
    const div = getEditor();
    if (div && !isValueEditor(div)) div.setAttribute("contenteditable", _locked ? "false" : "true");
    const controlled = writeEl();
    if (controlled && isValueEditor(controlled)) {
      if (_locked && controlled === div) controlled.setAttribute("readonly", "");
      else controlled.removeAttribute("readonly");
    }
    const ph = placeholderEl();
    if (ph) ph.style.visibility = _locked ? "hidden" : "";
  }
  function placeholderEl() {
    const div = getEditor();
    const rel = div && div.closest && div.closest(".relative");
    return rel ? rel.querySelector("div.pointer-events-none.absolute") : null;
  }

  const sendButton = () => [...document.querySelectorAll(S.sendBtn)].find((b) =>
    b.getClientRects().length > 0 &&
    !/stop|arrêter/i.test((b.getAttribute("aria-label") || "") + " " + (b.getAttribute("data-testid") || ""))
  ) || null;
  const stopButton = () =>
    [...document.querySelectorAll(S.stopBtn)].find((b) => b.getClientRects().length > 0) || null;

  function streamText(item) {
    const b = bodyOf(item);
    return b ? textWithout(b, ".zs-chip") : "";
  }
  const streamLen = (item) => streamText(item === undefined ? lastAssistant() : item).length;

  let _streamMax = -1, _streamAt = 0, _streamItem = null;
  function sampleStream() {
    const item = lastAssistant();
    const len = streamText(item).length;
    const now = Date.now();
    if (item !== _streamItem || len < _streamMax - 400) {
      _streamItem = item; _streamMax = len; _streamAt = now; return;
    }
    if (len > _streamMax) { _streamMax = len; _streamAt = now; }
  }
  const grewWithin = (ms) => _streamMax > 1 && Date.now() - _streamAt < ms;

  function genActive() {
    sampleStream();
    if (stopButton()) return true;
    return grewWithin(timings.GEN_IDLE_MS);
  }
  const isGenerating = genActive;
  const isBusyNow = genActive;
  const isHardGenerating = () => !!stopButton();

  const turnHalted = () => false;
  const findContinueBtn = () => null;
  const clickContinueBtn = () => false;

  function snapshot() {
    try {
      const b = bodyOf(lastAssistant());
      return { th: 0, rp: b ? textWithout(b).length : 0 };
    } catch { return {}; }
  }

  function readAssistant() {
    const item = lastAssistant();
    if (!item) return { present: false, reply: "", thinking: "", item: null };
    const b = bodyOf(item);
    return { present: true, reply: b ? textWithout(b, ".zs-chip").trim() : "", thinking: "", item };
  }

  async function waitFor(pred, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (pred()) return true;
      await sleep(120);
    }
    return false;
  }

  function fileFromImage(img, i) {
    const mime = img.mimeType || "image/jpeg";
    const bin = atob(img.data);
    const arr = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
    return new File([arr], `Nyx_${Date.now()}_${i}.${ext}`, { type: mime });
  }
  const fileInputEl = () => {
    for (const inp of document.querySelectorAll('input[type="file"]')) {
      if (!inp.closest("#zs-root")) return inp;
    }
    return null;
  };
  const pendingPreview = () => {
    for (const ci of editorEls()) {
      const img = ci.querySelector("img");
      if (img) return img;
    }
    return null;
  };
  const hasPendingAttachment = () => !!pendingPreview();
  let _imgSeq = 0;
  function tagImages(images) {
    if (images && images.__zsId == null) {
      try { Object.defineProperty(images, "__zsId", { value: ++_imgSeq, enumerable: false }); }
      catch { images.__zsId = ++_imgSeq; }
    }
    return images;
  }
  async function attachImages(images) {
    const inp = fileInputEl();
    if (!inp || !images || !images.length) return false;
    tagImages(images);
    const dt = new DataTransfer();
    images.forEach((img, i) => { try { dt.items.add(fileFromImage(img, i)); } catch {} });
    if (!dt.items.length) return false;
    try {
      inp.files = dt.files;
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    } catch { return false; }
    const ok = await waitFor(hasPendingAttachment, 15000);
    diag("meta.attach.preview", { ok });
    return ok;
  }
  function clearAttachments() {
    try {
      document.querySelectorAll('button[aria-label="Remove image"]').forEach((b) => { try { b.click(); } catch {} });
    } catch {}
    _attachedImages = null;
  }

  function setTextareaValue(el, v) {
    if (!el) return;
    const ctor = el.tagName === "INPUT" ? window.HTMLInputElement : window.HTMLTextAreaElement;
    const proto = ctor && ctor.prototype;
    const setter = proto && Object.getOwnPropertyDescriptor(proto, "value");
    if (setter && setter.set) setter.set.call(el, v);
    else el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Write the text into BOTH the hidden mirror textarea and Meta's visible Lexical
  // editor. Lexical keeps its own state and can ignore plain value writes on long
  // input, so the send handler may see an empty editor even when the textarea is
  // full. execCommand("insertText") goes through the editor's real input pipeline.
  function syncComposer(text) {
    const visible = getEditor();
    diag("meta.sync.start", { len: text.length, visibleIsDiv: !!visible && !isValueEditor(visible) });
    setTextareaValue(writeEl(), text);
    if (visible && !isValueEditor(visible)) {
      try {
        visible.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(visible);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand("delete", false, null);
        document.execCommand("insertText", false, text);
      } catch (e) {
        diag("meta.sync.execErr", { msg: String((e && e.message) || e) });
      }
    }
    diag("meta.sync.done", {
      textareaLen: ((writeEl() && writeEl().value) || "").length,
      visibleLen: ((visible && visible.textContent) || "").length,
    });
  }

  function pointerActivate(button) {
    if (!button) return;
    try { button.focus(); } catch {}
    try {
      const init = { bubbles: true, cancelable: true, view: window, button: 0 };
      if (typeof PointerEvent === "function") {
        button.dispatchEvent(new PointerEvent("pointerdown", { ...init, pointerId: 1, pointerType: "mouse" }));
        button.dispatchEvent(new PointerEvent("pointerup", { ...init, pointerId: 1, pointerType: "mouse" }));
      }
      button.dispatchEvent(new MouseEvent("mousedown", init));
      button.dispatchEvent(new MouseEvent("mouseup", init));
      button.dispatchEvent(new MouseEvent("click", init));
    } catch {}
  }

  function pressEnter(editor) {
    if (!editor) return;
    try { editor.focus(); } catch {}
    try {
      const init = { key: "Enter", code: "Enter", keyCode: 13, which: 13,
        bubbles: true, cancelable: true, view: window };
      editor.dispatchEvent(new KeyboardEvent("keydown", init));
      editor.dispatchEvent(new KeyboardEvent("keyup", init));
    } catch {}
  }

  function submitForm(button) {
    try {
      const form = button && button.closest && button.closest("form");
      if (!form) return false;
      if (typeof form.requestSubmit === "function") form.requestSubmit(button);
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return true;
    } catch { return false; }
  }

  async function typeAndSend(text, images) {
    if (images && images.length && images !== _attachedImages) {
      if (hasPendingAttachment()) clearAttachments();
      try {
        const ok = await attachImages(images);
        if (ok) _attachedImages = images;
        diag("meta.tas.attached", { ok, imgId: images.__zsId });
      } catch (e) { diag("meta.tas.attachErr", { msg: String((e && e.message) || e) }); }
    }
    const editor = writeEl();
    if (!editor) throw new Error("Meta AI input box not found");
    const usersBeforeSend = userCount();
    const assistantsBeforeSend = assistantCount();
    const explicitUsersBeforeSend = document.querySelectorAll(
      '[data-testid="user-message"],[data-testid="user-message-content"]'
    ).length;
    const pathBeforeSend = location.pathname;
    editor.focus();
    syncComposer(text);
    const sendReady = () => {
      const b = sendButton();
      return !!b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
    };
    const ready = await waitFor(sendReady, 30000);
    if (!ready) throw new Error("Meta AI send button did not become available.");
    const accepted = () =>
      (editorText().trim() === "" && !hasPendingAttachment()) ||
      userCount() > usersBeforeSend ||
      assistantCount() > assistantsBeforeSend ||
      document.querySelectorAll('[data-testid="user-message"],[data-testid="user-message-content"]').length > explicitUsersBeforeSend ||
      (location.pathname !== pathBeforeSend && location.pathname !== "/") ||
      !!stopButton();
    try { sendButton().click(); } catch (error) {
      throw new Error(`Meta AI send button failed: ${String(error && error.message || error)}`);
    }
    let sent = await waitFor(accepted, 1800);
    if (!sent) {
      const button = sendButton();
      submitForm(button);
      sent = await waitFor(accepted, 1800);
    }
    if (!sent) {
      pointerActivate(sendButton());
      sent = await waitFor(accepted, 1200);
    }
    if (!sent) {
      pressEnter(getEditor() || editor);
      sent = await waitFor(accepted, 8000);
    }
    if (sent) _attachedImages = null;
    diag("meta.tas.sent", {
      sent,
      editorLen: editorText().length,
      newUserTurn: userCount() > usersBeforeSend,
      newAssistantTurn: assistantCount() > assistantsBeforeSend,
      generating: !!stopButton(),
      fallback: !sent ? "none" : editorText().trim() === "" ? "clear" : stopButton() ? "stop" : "user-turn",
    });
    if (!sent) {
      const send = sendButton();
      throw new Error(
        `Meta AI did not confirm the message was sent (sent: ${text.length} chars, composer text: ${editorText().length} chars, ` +
        `send button: ${!!send}, stop button: ${!!stopButton()}). Check the composer and try again.`
      );
    }
  }

  function stopGeneration() {
    const b = stopButton();
    if (b) { try { b.click(); } catch {} }
  }

  const modeBtn = () => document.querySelector(S.modeBtn);
  const isReflexion = () => {
    const b = modeBtn();
    return !!b && /r[ée]flexion|think.?hard/i.test((b.textContent || "") + (b.getAttribute("data-testid") || ""));
  };
  let _modeInFlight = false;
  async function ensureThinkMode() {
    if (_modeInFlight) return;
    const b = modeBtn();
    if (!b || isReflexion()) return;
    _modeInFlight = true;
    try {
      const fire = (el, t) =>
        el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", button: 0 }));
      fire(b, "pointerdown"); fire(b, "pointerup"); try { b.click(); } catch {}
      const opened = await waitFor(() => !!document.querySelector(S.modeOptHard), 2000);
      if (opened) {
        const opt = document.querySelector(S.modeOptHard);
        try { opt.click(); } catch {}
        await waitFor(isReflexion, 2000);
      }
      if (document.querySelector(S.modeOptHard)) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      }
      diag("meta.mode.set", { reflexion: isReflexion() });
    } catch (e) {
      diag("meta.mode.err", { msg: String((e && e.message) || e) });
    } finally {
      _modeInFlight = false;
    }
  }

  function enforceComposer() { if (_locked) applyLock(); return { ready: true }; }
  async function ensureComposerReady(reason) {
    ensureThinkMode();
    diag("mode_ready", { reason, provider: "meta", ready: !!getEditor() });
    return { ready: !!getEditor() };
  }
  const modeWarning = () => "";
  const captchaPresent = () => false;
  function overlayBlocking() {
    for (const d of document.querySelectorAll('[role="dialog"]')) {
      if (d.closest("#zs-root")) continue;
      const r = d.getBoundingClientRect();
      if (r.width > 40 && r.height > 40 && r.top < innerHeight && r.bottom > 0) return true;
    }
    return false;
  }

  function scanError() {
    try {
      const list = listEl();
      for (const el of document.querySelectorAll(S.errorSurfaces)) {
        if (el.offsetParent === null) continue;
        if (list && list.contains(el)) continue;
        const t = (el.innerText || "").trim();
        if (t.length > 8 && t.length < 600 && RE.contextLimit.test(t)) return t.slice(0, 240);
      }
    } catch {}
    if (!getEditor()) return "The input box disappeared (session ended?).";
    return null;
  }
  const isTooLongMsg = (text) => RE.tooLong.test(text);
  const isBusyMsg = (text) => RE.busy.test(text);

  const conversationKey = () => (location.pathname === "/" ? "" : location.pathname);

  function installSendHooks(handlers) {
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
        const editor = visibleEditor();
        if (!editor || !editor.contains(e.target)) return;
        if (editorText().trim() === "") return;
        if (handlers.isBlocked()) return;
        if (!handlers.isStarted()) {
          if (!chatIsEmpty()) return;
          handlers.onBlockedAttempt();
          return;
        }
        handlers.onUserMessage(assistantCount());
      },
      true
    );

    document.addEventListener(
      "click",
      (e) => {
        if (!getEditor()) return;
        const btn = e.target && e.target.closest && e.target.closest("button");
        if (!btn) return;
        if (btn.matches(S.stopBtn) || btn.closest(S.stopBtn)) { handlers.onNativeStop(); return; }
        if (!(btn.matches(S.sendBtn) || btn.closest(S.sendBtn))) return;
        if (btn.disabled || btn.getAttribute("aria-disabled") === "true") return;
        if (handlers.isBlocked()) return;
        if (!handlers.isStarted()) {
          if (!chatIsEmpty()) return;
          handlers.onBlockedAttempt();
          return;
        }
        handlers.onUserMessage(assistantCount());
      },
      true
    );
  }

  const CMD_SHAPE = /"(?:command|tool)"\s*:\s*"|###\s*lua|###mcp_tool###/i;
  function findToolBlockSpot(item) {
    const b = bodyOf(item);
    if (!b) return null;
    let hidAny = null;
    b.querySelectorAll(S.codeWrap).forEach((cw) => {
      if (cw.closest(".zs-chip")) return;
      if (CMD_SHAPE.test(cw.textContent || "")) {
        cw.classList.add("zs-tool-hide");
        b.classList.add("zs-cmd-mask");
        hidAny = hidAny || { parent: cw.parentElement, ref: cw };
      }
    });
    b.querySelectorAll("p, div").forEach((el) => {
      if (el.closest(".zs-chip, .zs-tool-hide, " + S.codeWrap)) return;
      if (el.querySelector(S.codeWrap)) return;
      const t = (el.textContent || "").trim();
      const t0 = t.replace(/^json\s*/i, "");
      const startsAsCmd = /^\{\s*"(?:command|tool)"\s*:/.test(t0) || /^###\s*(?:lua|mcp_tool)/i.test(t0);
      if ((startsAsCmd || t.length < 600) && CMD_SHAPE.test(t) && /^[{#]/.test(t0)) {
        el.classList.add("zs-tool-hide");
        hidAny = hidAny || { parent: el.parentElement, ref: el };
      }
    });
    return hidAny;
  }

  return {
    id: "meta",
    displayName: "Meta AI",
    supportsVision: true,
    timings,
    chipAtItemLevel: true,
    chipAnchor,
    chipAppend: true,
    reliableCounts: true,
    init({ diag: d } = {}) { if (d) diag = d; },
    allItems, isUserItem, isAssistantItem, itemText, classifyText,
    assistantCount, userCount, lastAssistant, lastAssistantId, readAssistant,
    streamLen, snapshot,
    getEditor, editorText, chatIsEmpty, isFreshChat, composerFrame, barAnchor,
    coverTarget,
    coverMaxH: 260,
    setInputLock, typeAndSend, stopGeneration,
    isGenerating, isBusyNow, isHardGenerating,
    enforceComposer, ensureComposerReady, modeWarning, captchaPresent, overlayBlocking,
    turnHalted, findContinueBtn, clickContinueBtn,
    scanError, isTooLongMsg, isBusyMsg,
    attachImages, clearAttachments, conversationKey, installSendHooks, findToolBlockSpot,
  };
})();
