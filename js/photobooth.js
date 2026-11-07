// Photo Booth: opens over the home page when the camera is clicked (or at /#booth).
//
//  - Live webcam view (mirrored) with nine effects, previewed live in a 3 × 3 grid.
//  - Red shutter: 3-2-1 countdown, screen flash, shutter sound. "Strip" mode takes four
//    shots and lays them out as a classic photo-booth strip.
//  - The strip along the bottom holds the visitor's own shots, then Hailey's senior
//    portraits (data/portraits.json), plus a "Book a session" contact page.
//  - Photos never leave the visitor's device: they live in memory until the page closes.
//
// Anything with data-booth-open (or a link to #booth) opens it.

import { loadJSON, esc } from "/js/data.js";

const EMAIL = "hperng@usc.edu";

const EFFECTS = [
  { id: "sepia", name: "Sepia" }, { id: "bw", name: "Black & White" }, { id: "noir", name: "Noir" },
  { id: "pop", name: "Pop" }, { id: "normal", name: "Normal" }, { id: "thermal", name: "Thermal" },
  { id: "xray", name: "X-Ray" }, { id: "comic", name: "Comic" }, { id: "bulge", name: "Bulge" },
];

export function initBooth() {
  const root = document.createElement("div");
  root.className = "booth";
  root.hidden = true;
  root.innerHTML = `
    <div class="booth-backdrop" data-close></div>
    <div class="booth-window" role="dialog" aria-modal="true" aria-labelledby="booth-title">
      <div class="booth-titlebar">
        <div class="booth-lights">
          <button class="booth-light is-close" type="button" data-close aria-label="Close Photo Booth" data-cursor-label="Close"></button>
          <span class="booth-light"></span><span class="booth-light"></span>
        </div>
        <h2 id="booth-title" class="booth-title">Photo Booth</h2>
        <button class="booth-book" type="button" data-show-contact>Book a session</button>
      </div>

      <div class="booth-stage">
        <canvas class="booth-view" width="800" height="600" data-view aria-label="Camera preview"></canvas>
        <div class="booth-message" data-message hidden></div>
        <div class="booth-effects" data-effects hidden>
          ${EFFECTS.map((e) => `
            <button type="button" class="booth-effect" data-effect="${e.id}" aria-pressed="${e.id === "normal"}">
              <canvas width="192" height="144"></canvas><span>${e.name}</span>
            </button>`).join("")}
        </div>
        <div class="booth-preview" data-preview hidden></div>
        <div class="booth-count" data-count aria-live="assertive"></div>
      </div>

      <div class="booth-toolbar">
        <div class="booth-modes" role="group" aria-label="Capture mode">
          <button type="button" class="booth-tool" data-mode="photo" aria-pressed="true" title="Single photo">
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="1.5"/></svg><span>Photo</span>
          </button>
          <button type="button" class="booth-tool" data-mode="strip" aria-pressed="false" title="Four-shot strip">
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="1.5" width="8" height="4"/><rect x="6" y="6.5" width="8" height="4"/><rect x="6" y="11.5" width="8" height="4"/><rect x="6" y="16.5" width="8" height="2"/></svg><span>Strip ×4</span>
          </button>
        </div>
        <button type="button" class="booth-shutter" data-shutter aria-label="Take photo" data-cursor-label="Snap">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5 10 3h4l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="3.6"/></svg>
        </button>
        <div class="booth-right">
          <button type="button" class="booth-tool" data-effects-toggle aria-pressed="false">
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="4.5" height="4.5"/><rect x="7.75" y="2" width="4.5" height="4.5"/><rect x="13.5" y="2" width="4.5" height="4.5"/><rect x="2" y="7.75" width="4.5" height="4.5"/><rect x="7.75" y="7.75" width="4.5" height="4.5"/><rect x="13.5" y="7.75" width="4.5" height="4.5"/><rect x="2" y="13.5" width="4.5" height="4.5"/><rect x="7.75" y="13.5" width="4.5" height="4.5"/><rect x="13.5" y="13.5" width="4.5" height="4.5"/></svg><span>Effects</span>
          </button>
        </div>
      </div>

      <div class="booth-strip" data-strip role="list" aria-label="Photos"></div>
    </div>
    <div class="booth-flash" data-flash></div>`;
  document.body.append(root);

  const $ = (s) => root.querySelector(s);
  const win = $(".booth-window");
  const view = $("[data-view]");
  const viewCtx = view.getContext("2d", { willReadFrequently: true });
  const message = $("[data-message]");
  const effectsEl = $("[data-effects]");
  const preview = $("[data-preview]");
  const countEl = $("[data-count]");
  const flashEl = $("[data-flash]");
  const stripEl = $("[data-strip]");
  const shutterBtn = $("[data-shutter]");
  const effectsBtn = $("[data-effects-toggle]");
  const tiles = [...root.querySelectorAll(".booth-effect")].map((b) => ({ btn: b, id: b.dataset.effect, canvas: b.querySelector("canvas") }));
  tiles.forEach((t) => (t.ctx = t.canvas.getContext("2d", { willReadFrequently: true })));

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;

  let isOpen = false;
  let stream = null;
  let raf = 0;
  let effect = "normal";
  let captureMode = "photo";
  let busy = false;            // countdown in progress
  let cancelToken = 0;
  let selected = null;         // { type: "snap" | "portrait" | "contact", index }
  let returnFocus = null;
  let pushedState = false;
  const snaps = [];            // { url, kind, w, h, effect }
  let portraits = [];

  loadJSON("/data/portraits.json").then((d) => { portraits = d; renderStrip(); }).catch(() => renderStrip());

  /* ------------------------------------------------------------ open / close */
  function open({ fromHash = false } = {}) {
    if (isOpen) return;
    isOpen = true;
    returnFocus = document.activeElement;
    if (!fromHash && location.hash !== "#booth") { history.pushState({ booth: true }, "", "#booth"); pushedState = true; }
    root.hidden = false;
    document.documentElement.classList.add("booth-open");
    requestAnimationFrame(() => root.classList.add("is-open"));
    flash();
    showCamera();
    renderStrip();
    startCamera();
    setTimeout(() => shutterBtn.focus(), 50);
  }

  function close({ fromHash = false } = {}) {
    if (!isOpen) return;
    isOpen = false;
    cancelToken++;
    busy = false;
    countEl.textContent = "";
    stopCamera();
    root.classList.remove("is-open");
    document.documentElement.classList.remove("booth-open");
    setTimeout(() => { if (!isOpen) root.hidden = true; }, 250);
    if (!fromHash && location.hash === "#booth") {
      if (pushedState) history.back();
      else history.replaceState(null, "", location.pathname + location.search);
    }
    pushedState = false;
    returnFocus?.focus?.();
  }

  addEventListener("hashchange", () => (location.hash === "#booth" ? open({ fromHash: true }) : close({ fromHash: true })));
  addEventListener("popstate", () => { if (location.hash !== "#booth") close({ fromHash: true }); });
  if (location.hash === "#booth") open({ fromHash: true });

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-booth-open], a[href='#booth']");
    if (!t || root.contains(t)) return;
    e.preventDefault();
    open();
  });

  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) close();
    else if (e.target.closest("[data-show-contact]")) showContact();
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (!effectsEl.hidden) toggleEffects(false);
      else if (selected) showCamera();
      else close();
    } else if (e.key === "Tab") {
      const f = [...win.querySelectorAll("button, a[href], input, textarea, select")].filter((el) => !el.closest("[hidden]") && !el.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------------ camera */
  async function startCamera() {
    if (stream) return startLoop();
    if (!navigator.mediaDevices?.getUserMedia) return showMessage("This browser can't use a camera here. You can still look through the portraits below.");
    showMessage("Starting camera…", false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      if (!isOpen) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      video.srcObject = stream;
      await video.play();
      message.hidden = true;
      shutterBtn.disabled = false;
      startLoop();
    } catch (err) {
      showMessage("Camera is off. Allow camera access to take photos, or browse the portraits below.", true);
    }
  }

  function stopCamera() {
    cancelAnimationFrame(raf); raf = 0;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }

  function showMessage(text, retry = true) {
    message.hidden = false;
    message.innerHTML = `<p>${esc(text)}</p>${retry ? `<button type="button" class="booth-pill" data-retry>Try again</button>` : ""}`;
    message.querySelector("[data-retry]")?.addEventListener("click", startCamera);
    shutterBtn.disabled = !selected;
    viewCtx.fillStyle = "#111"; viewCtx.fillRect(0, 0, view.width, view.height);
  }

  function startLoop() {
    if (raf) return;
    const frame = () => {
      raf = isOpen && stream ? requestAnimationFrame(frame) : 0;
      if (!raf || video.readyState < 2) return;
      if (preview.hidden) draw(viewCtx, view.width, view.height, effect);
      if (!effectsEl.hidden) tiles.forEach((t) => draw(t.ctx, t.canvas.width, t.canvas.height, t.id));
    };
    raf = requestAnimationFrame(frame);
  }

  // Video → canvas: cover-crop, mirror, then apply the effect
  function draw(ctx, w, h, fx) {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) return;
    const s = Math.max(w / vw, h / vh), sw = w / s, sh = h / s;
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
    ctx.restore();
    if (fx !== "normal") {
      const img = ctx.getImageData(0, 0, w, h);
      applyEffect(fx, img);
      ctx.putImageData(img, 0, 0);
    }
  }

  // A full-resolution frame for saving
  function grab(fx) {
    const h = Math.min(video.videoHeight || 600, 1080), w = Math.round((h * 4) / 3);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d", { willReadFrequently: true }), w, h, fx);
    return c;
  }

  /* ------------------------------------------------------------ shooting */
  shutterBtn.addEventListener("click", () => {
    if (selected) { showCamera(); return; }
    if (!stream || busy) return;
    toggleEffects(false);
    shoot();
  });

  async function shoot() {
    busy = true;
    root.classList.add("is-busy");
    const token = ++cancelToken;
    const shots = captureMode === "strip" ? 4 : 1;
    const frames = [];
    for (let i = 0; i < shots; i++) {
      for (const n of i === 0 ? [3, 2, 1] : [2, 1]) {
        countEl.textContent = n;
        countEl.classList.remove("tick"); void countEl.offsetWidth; countEl.classList.add("tick");
        await wait(800);
        if (token !== cancelToken) return;
      }
      countEl.textContent = "";
      flash();
      click();
      frames.push(grab(effect));
      await wait(350);
    }
    const out = shots === 1 ? frames[0] : composeStrip(frames);
    const blob = await new Promise((r) => out.toBlob(r, "image/jpeg", 0.92));
    snaps.unshift({ url: URL.createObjectURL(blob), kind: shots === 1 ? "photo" : "strip", w: out.width, h: out.height });
    busy = false;
    root.classList.remove("is-busy");
    renderStrip();
    stripEl.scrollTo({ left: 0, behavior: "smooth" });
  }

  function composeStrip(frames) {
    const pad = 36, fw = 540, fh = 405, gap = 22, foot = 130;
    const c = document.createElement("canvas");
    c.width = fw + pad * 2; c.height = pad + frames.length * fh + (frames.length - 1) * gap + foot;
    const g = c.getContext("2d");
    g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, c.width, c.height);
    frames.forEach((f, i) => g.drawImage(f, pad, pad + i * (fh + gap), fw, fh));
    g.fillStyle = "#0f0f10"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '500 30px "JetBrains Mono", ui-monospace, monospace';
    const y = c.height - foot / 2;
    g.fillText("HAILEY PERNG · PHOTO BOOTH", c.width / 2, y - 18);
    g.font = '400 22px "JetBrains Mono", ui-monospace, monospace';
    g.fillStyle = "#5e6269";
    g.fillText(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(), c.width / 2, y + 22);
    return c;
  }

  function flash() {
    flashEl.classList.remove("go"); void flashEl.offsetWidth; flashEl.classList.add("go");
  }

  let audio = null;
  function click() {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const len = Math.floor(audio.sampleRate * 0.12);
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = (t < 0.35 ? Math.exp(-t * 40) : Math.exp(-(t - 0.45) * 30) * (t > 0.45 ? 0.8 : 0));
        d[i] = (Math.random() * 2 - 1) * env;
      }
      const src = audio.createBufferSource(); src.buffer = buf;
      const gain = audio.createGain(); gain.gain.value = 0.35;
      src.connect(gain).connect(audio.destination);
      src.start();
    } catch { /* sound is optional */ }
  }

  /* ------------------------------------------------------------ modes + effects */
  root.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    captureMode = b.dataset.mode;
    root.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    shutterBtn.setAttribute("aria-label", captureMode === "strip" ? "Take four photos" : "Take photo");
  }));

  effectsBtn.addEventListener("click", () => toggleEffects(effectsEl.hidden));
  function toggleEffects(show) {
    if (show && selected) showCamera();
    effectsEl.hidden = !show;
    effectsBtn.setAttribute("aria-pressed", String(show));
  }
  tiles.forEach((t) => t.btn.addEventListener("click", () => {
    effect = t.id;
    tiles.forEach((x) => x.btn.setAttribute("aria-pressed", String(x === t)));
    toggleEffects(false);
  }));

  /* ------------------------------------------------------------ strip + preview */
  function renderStrip() {
    const snapHTML = snaps.map((s, i) => `
      <button type="button" role="listitem" class="booth-thumb is-snap${s.kind === "strip" ? " is-tall" : ""}${selected?.type === "snap" && selected.index === i ? " is-selected" : ""}" data-snap="${i}" aria-label="Your ${s.kind} ${snaps.length - i}">
        <img src="${s.url}" alt="">
      </button>`).join("");
    const portraitHTML = portraits.map((p, i) => `
      <button type="button" role="listitem" class="booth-thumb${selected?.type === "portrait" && selected.index === i ? " is-selected" : ""}" data-portrait="${i}" aria-label="Senior portrait: ${esc(p.name)}">
        ${p.src ? `<img src="${esc(p.src)}" alt="" loading="lazy">` : `<span class="booth-thumb-ph">${esc(initials(p.name))}</span>`}
      </button>`).join("");
    stripEl.innerHTML = `
      <button type="button" role="listitem" class="booth-thumb is-contact${selected?.type === "contact" ? " is-selected" : ""}" data-show-contact aria-label="Book a senior session">
        <span>Book a<br>session</span>
      </button>
      ${snaps.length ? `<span class="booth-divider label" role="presentation">Yours</span>${snapHTML}` : ""}
      <span class="booth-divider label" role="presentation">Seniors ’26</span>${portraitHTML}`;
  }

  stripEl.addEventListener("click", (e) => {
    const b = e.target.closest(".booth-thumb");
    if (!b) return;
    if (b.dataset.snap) showSnap(+b.dataset.snap);
    else if (b.dataset.portrait) showPortrait(+b.dataset.portrait);
  });

  function setPreview(sel, html) {
    selected = sel;
    toggleEffects(false);
    preview.hidden = false;
    preview.innerHTML = html;
    shutterBtn.disabled = false;
    shutterBtn.setAttribute("aria-label", "Back to camera");
    root.classList.add("is-previewing");
    renderStrip();
  }

  function showCamera() {
    selected = null;
    preview.hidden = true;
    preview.innerHTML = "";
    root.classList.remove("is-previewing");
    shutterBtn.setAttribute("aria-label", captureMode === "strip" ? "Take four photos" : "Take photo");
    shutterBtn.disabled = !stream;
    renderStrip();
  }

  function showSnap(i) {
    const s = snaps[i];
    setPreview({ type: "snap", index: i }, `
      <figure class="booth-figure${s.kind === "strip" ? " is-tall" : ""}"><img src="${s.url}" alt="Your ${s.kind}"></figure>
      <div class="booth-preview-bar">
        <p class="label">Your ${s.kind} · stays on this device</p>
        <div>
          <a class="booth-pill" href="${s.url}" download="hailey-perng-photo-booth-${Date.now()}.jpg">Save</a>
          <button type="button" class="booth-pill" data-delete>Delete</button>
          <button type="button" class="booth-pill is-dark" data-back>Back to camera</button>
        </div>
      </div>`);
    preview.querySelector("[data-delete]").addEventListener("click", () => {
      URL.revokeObjectURL(s.url);
      snaps.splice(i, 1);
      showCamera();
    });
    preview.querySelector("[data-back]").addEventListener("click", showCamera);
  }

  function showPortrait(i) {
    const p = portraits[i];
    setPreview({ type: "portrait", index: i }, `
      <figure class="booth-figure">
        ${p.src ? `<img src="${esc(p.src)}" alt="${esc(p.alt || p.name)}">` : `<div class="booth-figure-ph"><span class="label">Senior portrait · placeholder</span><strong>${esc(p.name)}</strong></div>`}
      </figure>
      <div class="booth-preview-bar">
        <p class="label">${esc(p.name)} · ${esc(p.school)} · Class of ${esc(p.year)}${p.location ? ` · ${esc(p.location)}` : ""}</p>
        <div>
          <button type="button" class="booth-pill" data-show-contact>Book yours</button>
          <button type="button" class="booth-pill is-dark" data-back>Back to camera</button>
        </div>
      </div>`);
    preview.querySelector("[data-back]").addEventListener("click", showCamera);
  }

  function showContact() {
    setPreview({ type: "contact" }, `
      <div class="booth-contact">
        <div>
          <p class="label">Contact · Senior portraits</p>
          <h3>Book a senior session</h3>
          <p>Placeholder: about an hour on location around Los Angeles, with a private online gallery of edited photos. Tell me your school, your grad year and a few dates that work.</p>
          <ul class="booth-contact-links">
            <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
            <li><a href="#" data-cursor-label="Soon">Instagram ↗</a></li>
            <li><a href="/contact/">Contact page →</a></li>
          </ul>
        </div>
        <form class="booth-form" data-form>
          <label><span class="label">Name</span><input name="name" required autocomplete="name"></label>
          <label><span class="label">School</span><input name="school" autocomplete="organization"></label>
          <label><span class="label">Grad year</span><input name="year" inputmode="numeric" placeholder="2026"></label>
          <label><span class="label">Dates that work</span><input name="dates"></label>
          <label class="is-wide"><span class="label">Anything else</span><textarea name="note" rows="3"></textarea></label>
          <div class="is-wide booth-form-actions">
            <button type="submit" class="booth-pill is-dark">Write email</button>
            <span class="label">Opens your email app</span>
          </div>
        </form>
      </div>`);
    preview.querySelector("[data-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const subject = `Senior session: ${f.name}${f.school ? `, ${f.school}` : ""}`;
      const body = [`Name: ${f.name}`, `School: ${f.school}`, `Grad year: ${f.year}`, `Dates: ${f.dates}`, "", f.note].join("\n");
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
    preview.querySelector("input")?.focus();
  }

  return { open, close };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const initials = (name = "") => name.split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();

/* ================================================================ effects */

// Thermal palette: black → blue → magenta → red → yellow → white
const THERMAL = (() => {
  const stops = [[0, [10, 10, 40]], [0.25, [40, 30, 200]], [0.45, [200, 30, 160]], [0.65, [240, 60, 30]], [0.85, [255, 220, 40]], [1, [255, 255, 240]]];
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
    const u = (t - t0) / (t1 - t0);
    for (let j = 0; j < 3; j++) out[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * u;
  }
  return out;
})();

const bulgeMaps = new Map();
function bulgeMap(w, h) {
  const key = w + "x" + h;
  if (bulgeMaps.has(key)) return bulgeMaps.get(key);
  const map = new Int32Array(w * h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.48;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / R, dy = (y - cy) / R, r = Math.hypot(dx, dy);
      let sx = x, sy = y;
      if (r < 1) {
        // sample closer to the center → magnifies the middle, seamless at the edge
        sx = cx + (x - cx) * Math.pow(r, 0.6);
        sy = cy + (y - cy) * Math.pow(r, 0.6);
      }
      map[y * w + x] = ((Math.round(sy) * w + Math.round(sx)) * 4);
    }
  }
  bulgeMaps.set(key, map);
  return map;
}

function applyEffect(id, img) {
  const d = img.data, n = d.length;
  if (id === "bulge") {
    const src = d.slice(), map = bulgeMap(img.width, img.height);
    for (let i = 0, p = 0; i < n; i += 4, p++) {
      const j = map[p];
      d[i] = src[j]; d[i + 1] = src[j + 1]; d[i + 2] = src[j + 2];
    }
    return;
  }
  for (let i = 0; i < n; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    switch (id) {
      case "bw": d[i] = d[i + 1] = d[i + 2] = l; break;
      case "sepia": d[i] = l * 1.07 + 32; d[i + 1] = l * 0.9 + 14; d[i + 2] = l * 0.68; break;
      case "noir": d[i] = d[i + 1] = d[i + 2] = (l - 128) * 1.8 + 110; break;
      case "pop":
        d[i] = (l + (r - l) * 1.9 - 128) * 1.15 + 128;
        d[i + 1] = (l + (g - l) * 1.9 - 128) * 1.15 + 128;
        d[i + 2] = (l + (b - l) * 1.9 - 128) * 1.15 + 128;
        break;
      case "thermal": { const k = (l | 0) * 3; d[i] = THERMAL[k]; d[i + 1] = THERMAL[k + 1]; d[i + 2] = THERMAL[k + 2]; break; }
      case "xray": { const v = 255 - l; d[i] = v * 0.8; d[i + 1] = v * 0.92; d[i + 2] = v * 1.05 + 14; break; }
      case "comic": {
        if (l < 55) { d[i] = d[i + 1] = d[i + 2] = 12; break; }
        const q = (c) => Math.round((c / 255) * 3) * 85;
        d[i] = q(r * 1.1); d[i + 1] = q(g * 1.1); d[i + 2] = q(b * 1.1);
        break;
      }
    }
  }
}
