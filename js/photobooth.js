// Photo Booth: opens over the home page from the Photo Booth button (or at /#booth).
//
//  - Live webcam viewfinder (mirrored, 3:2 like a 35mm frame).
//  - Shutter: 3-2-1 countdown, white flash, click sound, then the shot flies into the film
//    camera beside it and the film winds on. Each exposure develops from a negative and
//    can be opened, saved or removed.
//  - Senior photos on a roll of film (data/portraits.json). Wind it with the arrows, a swipe
//    or the arrow keys; click any exposure to explore every photo.
//  - Below: how to book senior photos, contact details and a booking form.
//  - Visitors' photos never leave their device: they live in memory until the page closes.
//
// Anything with data-booth-open (or a link to #booth) opens it.

import { loadJSON, esc } from "/js/data.js";

const EMAIL = "haileyperng.acting@gmail.com";
const SITE = "haileyperng.github.io";
// Printed along the film edge of every saved exposure
const PRINT = { title: "Document more memories", lines: [EMAIL, SITE] };
const STEP = 180;        // one frame of film in the camera, px (a multiple of the 30px sprocket pitch)
const DEVELOP_MS = 4000;

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
        <a class="booth-book" href="#booth-roll" data-jump>Senior photos ↓</a>
      </div>

      <div class="booth-scroll" data-scroll>
        <section class="booth-shoot">
          <div class="booth-cam">
            <div class="booth-finder">
              <canvas class="booth-view" width="900" height="600" data-view aria-label="Camera preview"></canvas>
              <div class="booth-message" data-message hidden></div>
              <div class="booth-count" data-count aria-live="assertive"></div>
            </div>
            <div class="booth-controls">
              <span class="label">35mm · HP 400</span>
              <button type="button" class="booth-shutter" data-shutter aria-label="Take a photo" data-cursor-label="Snap"></button>
              <span class="label booth-counter" data-shots>0 exposures</span>
            </div>
          </div>

          <div class="filmcam">
            <div class="filmcam-top" aria-hidden="true">
              <span class="filmcam-rewind"></span>
              <span class="filmcam-name">HP-35</span>
              <span class="filmcam-counter" data-counter>00</span>
              <span class="filmcam-lever" data-lever></span>
            </div>
            <div class="filmcam-back">
              <div class="filmcam-can" aria-hidden="true"><span>HP<br>400</span></div>
              <div class="filmcam-gate" data-gate>
                <div class="filmcam-track" data-track aria-label="Your exposures">
                  <span class="filmcam-frame is-blank"></span><span class="filmcam-frame is-blank"></span><span class="filmcam-frame is-blank"></span>
                </div>
              </div>
              <div class="filmcam-spool" data-spool aria-hidden="true"></div>
            </div>
            <p class="filmcam-note label">Every shot winds onto this roll. Click one to see it and save it. Your photos stay on this device.</p>
          </div>
        </section>

        <section class="booth-roll" id="booth-roll" data-roll aria-labelledby="booth-roll-title" hidden>
          <div class="booth-roll-head">
            <div>
              <p class="label">Roll 01 · Seniors ’26</p>
              <h3 id="booth-roll-title">Senior photos</h3>
            </div>
            <div class="booth-roll-controls">
              <span class="label" data-roll-count></span>
              <button type="button" class="booth-roll-btn" data-roll-prev aria-label="Previous exposure">←</button>
              <button type="button" class="booth-roll-btn" data-roll-next aria-label="Next exposure">→</button>
            </div>
          </div>
          <div class="booth-roll-view" data-roll-view>
            <div class="booth-roll-track" data-roll-track>
              <svg class="booth-roll-can" viewBox="0 0 96 180" aria-hidden="true">
                <defs>
                  <linearGradient id="booth-can" x1="0" x2="1"><stop offset="0" stop-color="#26272a"/><stop offset=".35" stop-color="#55575c"/><stop offset=".75" stop-color="#1a1b1d"/><stop offset="1" stop-color="#0c0c0d"/></linearGradient>
                  <linearGradient id="booth-cap" x1="0" x2="1"><stop offset="0" stop-color="#8d9096"/><stop offset=".35" stop-color="#eceef0"/><stop offset=".7" stop-color="#b6b9be"/><stop offset="1" stop-color="#64676d"/></linearGradient>
                </defs>
                <rect x="36" y="0" width="28" height="10" fill="#3a3c40"/>
                <rect x="6" y="8" width="84" height="16" rx="3" fill="url(#booth-cap)"/>
                <rect x="6" y="156" width="84" height="16" rx="3" fill="url(#booth-cap)"/>
                <rect x="10" y="22" width="78" height="136" fill="url(#booth-can)"/>
                <rect x="26" y="22" width="36" height="136" fill="#e6e7e9"/>
                <text transform="translate(50 90) rotate(-90)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="500" fill="#0f0f10">HP 400 · SENIORS</text>
                <rect x="86" y="30" width="10" height="120" fill="#050506"/>
              </svg>
              <div class="booth-roll-film" data-roll-film></div>
            </div>
          </div>
          <div class="booth-roll-caption" data-roll-caption aria-live="polite"></div>
        </section>

        <section class="booth-seniors" id="booth-seniors" aria-labelledby="booth-seniors-title">
          <div class="booth-seniors-head">
            <p class="label">Senior portraits · Class of 2027</p>
            <h3 id="booth-seniors-title">Book your senior photos</h3>
          </div>
          <div class="booth-seniors-grid">
            <div>
              <p>Placeholder: a relaxed session on location around Los Angeles, made to feel like you. Bring a friend, an outfit change or two, and anything that tells your story.</p>
              <ul class="booth-includes">
                <li><span class="label">Session</span>1, 2 or 3 hours</li>
                <li><span class="label">Photos</span>80+ edited photos</li>
                <li><span class="label">Turnaround</span>1 week</li>
                <li><span class="label">Rate</span><span class="booth-rates"><span>1 hour · $100</span><span>2 hours · $150</span><span>3 hours · $200</span></span></li>
              </ul>
              <a class="booth-email" href="mailto:${EMAIL}?subject=${encodeURIComponent("Senior photos")}">${EMAIL}</a>
              <ul class="booth-links">
                <li><a href="https://www.instagram.com/hp_filmz/" target="_blank" rel="noopener">Instagram @hp_filmz ↗</a></li>
                <li><a href="/contact/">Contact page →</a></li>
              </ul>
            </div>
            <form class="booth-form" data-form>
              <label><span class="label">Name</span><input name="name" required autocomplete="name"></label>
              <label><span class="label">School</span><input name="school" autocomplete="organization"></label>
              <label><span class="label">Grad year</span><input name="year" inputmode="numeric" placeholder="2027"></label>
              <label><span class="label">Dates that work</span><input name="dates"></label>
              <label class="is-wide"><span class="label">Anything else</span><textarea name="note" rows="3" placeholder="Locations, vibe, who's coming…"></textarea></label>
              <div class="is-wide booth-form-actions">
                <button type="submit" class="booth-pill is-dark">Write email</button>
                <span class="label">Opens your email app</span>
              </div>
            </form>
          </div>
        </section>
      </div>

      <div class="booth-viewer" data-viewer role="group" aria-label="Photo viewer" hidden>
        <button type="button" class="booth-viewer-close" data-viewer-close aria-label="Close photo">×</button>
        <button type="button" class="booth-viewer-nav" data-viewer-prev aria-label="Previous photo">←</button>
        <figure class="booth-viewer-figure" data-viewer-figure></figure>
        <button type="button" class="booth-viewer-nav" data-viewer-next aria-label="Next photo">→</button>
        <div class="booth-viewer-bar" data-viewer-bar></div>
      </div>
    </div>
    <div class="booth-flash" data-flash></div>`;
  document.body.append(root);

  const $ = (s) => root.querySelector(s);
  const win = $(".booth-window");
  const scroller = $("[data-scroll]");
  const view = $("[data-view]");
  const viewCtx = view.getContext("2d");
  const message = $("[data-message]");
  const countEl = $("[data-count]");
  const flashEl = $("[data-flash]");
  const shutterBtn = $("[data-shutter]");
  const shotsEl = $("[data-shots]");
  const counter = $("[data-counter]");
  const gate = $("[data-gate]");
  const track = $("[data-track]");
  const finder = $(".booth-finder");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;

  let isOpen = false;
  let stream = null;
  let raf = 0;
  let busy = false;
  let cancelToken = 0;
  let returnFocus = null;
  let pushedState = false;
  let exposures = 0;
  const shots = [];         // newest first: { url, n, date, el }

  loadJSON("/data/portraits.json").then(initRoll).catch(() => {});

  /* ------------------------------------------------------------ open / close */
  function open({ fromHash = false } = {}) {
    if (isOpen) return;
    isOpen = true;
    returnFocus = document.activeElement;
    if (!fromHash && location.hash !== "#booth") { history.pushState({ booth: true }, "", "#booth"); pushedState = true; }
    root.hidden = false;
    document.documentElement.classList.add("booth-open");
    requestAnimationFrame(() => root.classList.add("is-open"));
    scroller.scrollTop = 0;
    flash();
    startCamera();
    setTimeout(() => shutterBtn.focus(), 50);
  }

  function close({ fromHash = false } = {}) {
    if (!isOpen) return;
    isOpen = false;
    cancelToken++;
    busy = false;
    root.classList.remove("is-busy");
    countEl.textContent = "";
    closeViewer();
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
    else {
      const jump = e.target.closest("[data-jump]");
      if (jump) {
        e.preventDefault();
        closeViewer();
        $(jump.getAttribute("href")).scrollIntoView({ behavior: "smooth" });
      }
    }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (viewer.list) closeViewer(); else close();
    } else if (viewer.list && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      showViewer(viewer.index + (e.key === "ArrowLeft" ? -1 : 1));
    } else if (e.key === "Tab") {
      const scope = viewer.list ? $("[data-viewer]") : win;
      const f = [...scope.querySelectorAll("button, a[href], input, textarea, select")].filter((el) => !el.closest("[hidden]") && !el.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------------ webcam */
  async function startCamera() {
    if (stream) return startLoop();
    if (!navigator.mediaDevices?.getUserMedia) return showMessage("This browser can't use a camera here. Scroll down for senior photos.", false);
    showMessage("Starting camera…", false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1620 }, height: { ideal: 1080 } }, audio: false });
      if (!isOpen) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      video.srcObject = stream;
      await video.play();
      message.hidden = true;
      shutterBtn.disabled = false;
      startLoop();
    } catch {
      showMessage("Camera is off. Allow camera access in your browser to take a photo.", true);
    }
  }

  function stopCamera() {
    cancelAnimationFrame(raf); raf = 0;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }

  function showMessage(text, retry) {
    message.hidden = false;
    message.innerHTML = `<p>${esc(text)}</p>${retry ? `<button type="button" class="booth-pill" data-retry>Try again</button>` : ""}`;
    message.querySelector("[data-retry]")?.addEventListener("click", startCamera);
    shutterBtn.disabled = true;
    viewCtx.fillStyle = "#111"; viewCtx.fillRect(0, 0, view.width, view.height);
  }

  function startLoop() {
    if (raf) return;
    const frame = () => {
      raf = isOpen && stream ? requestAnimationFrame(frame) : 0;
      if (raf && video.readyState >= 2) draw(viewCtx, view.width, view.height);
    };
    raf = requestAnimationFrame(frame);
  }

  // Video → canvas: cover-crop, mirrored like a selfie
  function draw(ctx, w, h) {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) return;
    const s = Math.max(w / vw, h / vh), sw = w / s, sh = h / s;
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
    ctx.restore();
  }

  /* ------------------------------------------------------------ shooting */
  shutterBtn.addEventListener("click", () => { if (stream && !busy) shoot(); });

  async function shoot() {
    busy = true;
    root.classList.add("is-busy");
    const token = ++cancelToken;
    for (const n of [3, 2, 1]) {
      countEl.textContent = n;
      countEl.classList.remove("tick"); void countEl.offsetWidth; countEl.classList.add("tick");
      await wait(800);
      if (token !== cancelToken) return;
    }
    countEl.textContent = "";
    flash();
    click();

    const h = Math.min(video.videoHeight || 720, 1080), w = Math.round(h * 1.5);
    const photo = document.createElement("canvas");
    photo.width = w; photo.height = h;
    draw(photo.getContext("2d"), w, h);

    exposures++;
    const n = exposures;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const thumb = photo.toDataURL("image/jpeg", 0.85);
    const strip = await compose(photo, date, n);
    const url = URL.createObjectURL(await new Promise((r) => strip.toBlob(r, "image/jpeg", 0.92)));
    if (token !== cancelToken) { URL.revokeObjectURL(url); return; }

    await loadIntoCamera(thumb, url, n, date);
    busy = false;
    root.classList.remove("is-busy");
  }

  // The shot flies from the viewfinder into the camera, then the film winds on
  async function loadIntoCamera(thumb, url, n, date) {
    track.querySelector(".is-blank:last-child")?.remove();
    const el = document.createElement("button");
    el.type = "button";
    el.className = "filmcam-frame is-new";
    el.setAttribute("aria-label", `Exposure ${n}, ${date}`);
    el.style.setProperty("--develop", `${DEVELOP_MS}ms`);
    el.innerHTML = `<img src="${thumb}" alt="" draggable="false">`;
    track.prepend(el);
    const shot = { url, n, date, el };
    shots.unshift(shot);
    el.addEventListener("click", () => openShots(shot));

    counter.textContent = String(n).padStart(2, "0");
    shotsEl.textContent = `${n} exposure${n === 1 ? "" : "s"}`;

    if (!reduceMotion) {
      const from = finder.getBoundingClientRect();
      const fly = new Image();
      fly.src = thumb;
      fly.className = "filmcam-fly";
      fly.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
      root.append(fly);
      const to = el.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = to.left - from.left, dy = to.top - from.top;
      const anim = fly.animate(
        [{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 1 }],
        { duration: 750, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" },
      );
      await anim.finished.catch(() => {});
      fly.remove();

      const wind = { duration: 650, easing: "cubic-bezier(.3,.1,.2,1)" };
      track.animate([{ transform: `translateX(${-STEP}px)` }, { transform: "none" }], wind);
      gate.animate([{ backgroundPosition: `${-STEP}px 0, ${-STEP}px 100%` }, { backgroundPosition: "0px 0, 0px 100%" }], wind);
      $("[data-spool]").animate([{ transform: "rotate(0)" }, { transform: "rotate(220deg)" }], wind);
      $("[data-lever]").animate([{ transform: "rotate(0)" }, { transform: "rotate(-48deg)" }, { transform: "rotate(0)" }], wind);
    }
    el.classList.remove("is-new");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-developing")));
    await wait(reduceMotion ? 0 : 650);
  }

  // A saved exposure: a strip of film with the contact details printed along the edge
  async function compose(photo, date, n) {
    await document.fonts.load('34px "Special Elite"').catch(() => {});
    const W = 1500, side = 40, imgW = W - side * 2, imgH = Math.round(imgW / 1.5);
    const holes = 80, topText = 50, footText = 78;
    const H = holes + topText + imgH + footText + holes;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#0f0f10"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#f4f4f2";
    for (let x = 18; x < W; x += 75) {
      for (const y of [18, H - 62]) {
        g.beginPath();
        if (g.roundRect) g.roundRect(x, y, 44, 44, 8); else g.rect(x, y, 44, 44);
        g.fill();
      }
    }
    g.drawImage(photo, side, holes + topText, imgW, imgH);

    const type = (px) => `${px}px "Special Elite", "Courier New", monospace`;
    g.textBaseline = "middle";
    const y1 = holes + topText / 2, y2 = holes + topText + imgH + footText / 2;
    g.fillStyle = "#9a9ea5"; g.font = type(26);
    g.textAlign = "left"; g.fillText(date, side, y1);
    g.textAlign = "right"; g.fillText(`▸ ${n}A`, W - side, y1);
    g.textAlign = "right"; g.fillText(PRINT.lines.join("  ·  "), W - side, y2);
    g.fillStyle = "#f4f4f2"; g.font = type(36);
    g.textAlign = "left"; g.fillText(PRINT.title.toUpperCase(), side, y2);
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
        const env = t < 0.35 ? Math.exp(-t * 40) : t > 0.45 ? Math.exp(-(t - 0.45) * 30) * 0.8 : 0;
        d[i] = (Math.random() * 2 - 1) * env;
      }
      const src = audio.createBufferSource(); src.buffer = buf;
      const gain = audio.createGain(); gain.gain.value = 0.35;
      src.connect(gain).connect(audio.destination);
      src.start();
    } catch { /* sound is optional */ }
  }

  /* ------------------------------------------------------------ photo viewer
     Used for both the senior roll and the visitor's own exposures. */
  const viewer = { list: null, index: 0, returnTo: null };
  const viewerEl = $("[data-viewer]");
  const viewerFig = $("[data-viewer-figure]");
  const viewerBar = $("[data-viewer-bar]");
  const viewerPrev = $("[data-viewer-prev]");
  const viewerNext = $("[data-viewer-next]");

  function openViewer(list, index, returnTo) {
    viewer.list = list;
    viewer.returnTo = returnTo || document.activeElement;
    viewerEl.hidden = false;
    showViewer(index);
    $("[data-viewer-close]").focus();
  }

  function closeViewer() {
    if (!viewer.list) return;
    viewer.list = null;
    viewerEl.hidden = true;
    viewerFig.innerHTML = "";
    viewer.returnTo?.focus?.();
  }

  function showViewer(n) {
    const list = viewer.list;
    if (!list?.length) return closeViewer();
    viewer.index = Math.max(0, Math.min(list.length - 1, n));
    const item = list[viewer.index];
    viewerFig.innerHTML = item.src
      ? `<img src="${esc(item.src)}" alt="${esc(item.alt)}" draggable="false">`
      : `<div class="booth-viewer-ph"><span class="label">Placeholder photo</span><strong>${esc(item.title)}</strong></div>`;
    viewerBar.innerHTML = `
      <p class="label">${esc(item.title)}${item.meta ? ` · ${esc(item.meta)}` : ""} · ${viewer.index + 1} of ${list.length}</p>
      <div>${item.actions || ""}</div>`;
    viewerPrev.disabled = viewer.index === 0;
    viewerNext.disabled = viewer.index === list.length - 1;
    item.onShow?.(viewer.index);
  }

  viewerPrev.addEventListener("click", () => showViewer(viewer.index - 1));
  viewerNext.addEventListener("click", () => showViewer(viewer.index + 1));
  $("[data-viewer-close]").addEventListener("click", closeViewer);
  viewerEl.addEventListener("click", (e) => { if (e.target === viewerEl) closeViewer(); });
  viewerBar.addEventListener("click", (e) => {
    if (!e.target.closest("[data-remove-shot]")) return;
    const item = viewer.list[viewer.index];
    URL.revokeObjectURL(item.shot.url);
    item.shot.el.remove();
    shots.splice(shots.indexOf(item.shot), 1);
    viewer.list.splice(viewer.index, 1);
    if (viewer.list.length) showViewer(viewer.index);
    else closeViewer();
  });
  let viewerStart = null;
  viewerFig.addEventListener("pointerdown", (e) => { viewerStart = e.clientX; });
  viewerFig.addEventListener("pointerup", (e) => {
    if (viewerStart === null) return;
    const dx = e.clientX - viewerStart;
    viewerStart = null;
    if (Math.abs(dx) > 40) showViewer(viewer.index + (dx < 0 ? 1 : -1));
  });

  function openShots(shot) {
    const list = shots.map((s) => ({
      shot: s,
      src: s.url,
      alt: `Your exposure from ${s.date}`,
      title: `Exposure ${s.n}`,
      meta: s.date,
      actions: `<a class="booth-pill" href="${s.url}" download="perng-production-exposure-${s.n}.jpg">Save</a>
                <button type="button" class="booth-pill" data-remove-shot>Remove</button>`,
    }));
    openViewer(list, shots.indexOf(shot), shot.el);
  }

  /* ------------------------------------------------------------ senior roll
     Every photo in data/portraits.json is one exposure. Wind with the arrows, a swipe or the
     arrow keys; the exposure in the gate is developed and the rest stay negatives. */
  function initRoll(seniors) {
    const section = $("[data-roll]");
    const view = $("[data-roll-view]");
    const track = $("[data-roll-track]");
    const film = $("[data-roll-film]");
    const caption = $("[data-roll-caption]");
    const count = $("[data-roll-count]");
    const prev = $("[data-roll-prev]");
    const next = $("[data-roll-next]");
    const pad = (n) => String(n).padStart(2, "0");
    const yr = (s) => `’${String(s.year).slice(-2)}`;

    // (a browser may briefly hold an older copy of the data with one photo per senior)
    const photos = seniors.flatMap((s) => (s.photos || [{ src: s.src, alt: s.alt }]).map((p) => ({
      src: p.src,
      alt: p.alt || `Senior portrait of ${s.name}`,
      title: `${s.name} ${yr(s)}`,
      meta: s.location,
      actions: `<a class="booth-pill" href="#booth-seniors" data-jump>Book yours ↓</a>`,
    })));
    const items = [...photos, { blank: true }];

    section.hidden = false;
    film.innerHTML = items.map((e, n) => `
      <button type="button" class="booth-roll-frame${e.blank ? " is-blank" : ""}" data-frame="${n}" aria-label="${e.blank ? "Next exposure: yours" : `Exposure ${n + 1}: ${esc(e.title)}. Open photo.`}" ${e.blank ? "" : `data-cursor-label="View"`}>
        <span class="booth-roll-img">
          ${e.blank ? `<span class="label">Unexposed</span>` : e.src ? `<img src="${esc(e.src)}" alt="" loading="lazy" draggable="false">` : `<span class="booth-roll-ph">${esc(e.title)}</span>`}
        </span>
      </button>`).join("");
    const frames = [...film.children];

    let current = 0, swiped = false, startX = null;

    function place() {
      const f = frames[current];
      track.style.transform = `translateX(${Math.round(view.clientWidth / 2 - (f.offsetLeft + f.offsetWidth / 2))}px)`;
    }

    function go(n) {
      current = Math.max(0, Math.min(items.length - 1, n));
      const e = items[current];
      frames.forEach((f, k) => {
        f.classList.toggle("is-active", k === current);
        if (k === current) f.setAttribute("aria-current", "true"); else f.removeAttribute("aria-current");
      });
      count.textContent = `Exposure ${pad(current + 1)} / ${pad(items.length)}`;
      prev.disabled = current === 0;
      next.disabled = current === items.length - 1;
      caption.innerHTML = e.blank
        ? `<h4>This one's yours.</h4><a class="booth-pill is-dark" href="#booth-seniors" data-jump>Book your senior photos ↓</a>`
        : `<h4>${esc(e.title)}</h4><p>${esc(e.meta)}</p><p class="label">Click any exposure to explore</p>`;
      place();
    }

    // Winding through the viewer keeps the strip in step
    photos.forEach((p) => { p.onShow = (i) => { if (i !== current) go(i); }; });

    prev.addEventListener("click", () => go(current - 1));
    next.addEventListener("click", () => go(current + 1));
    film.addEventListener("click", (e) => {
      const f = e.target.closest("[data-frame]");
      if (!f || swiped) return;
      const n = +f.dataset.frame;
      go(n);
      if (!items[n].blank) openViewer(photos, n, f);
    });
    section.addEventListener("keydown", (e) => {
      if (viewer.list) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    });
    view.addEventListener("pointerdown", (e) => { startX = e.clientX; swiped = false; });
    addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { swiped = true; go(current + (dx < 0 ? 1 : -1)); }
    });
    addEventListener("pointercancel", () => { startX = null; });

    // The booth starts hidden, so position the strip once it has a size
    new ResizeObserver(place).observe(view);
    go(0);
  }

  $("[data-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const subject = `Senior photos: ${f.name}${f.school ? `, ${f.school}` : ""}`;
    const body = [`Name: ${f.name}`, `School: ${f.school}`, `Grad year: ${f.year}`, `Dates: ${f.dates}`, "", f.note].join("\n");
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  return { open, close };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
