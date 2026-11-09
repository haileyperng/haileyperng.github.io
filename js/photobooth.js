// Photo Booth: opens over the home page when the camera is clicked (or at /#booth).
//
//  - Live webcam viewfinder (mirrored, square like instant film).
//  - Shutter: 3-2-1 countdown, white flash, click sound, then a Polaroid ejects from the
//    slot and slowly develops. Polaroids pile up beside the camera; each can be saved.
//  - A film roll of "how I got here" (data/timeline.json), wound frame by frame.
//  - Below: how to book senior photos, contact details, a booking form and past seniors
//    (data/portraits.json) shown as Polaroids.
//  - Photos never leave the visitor's device: they live in memory until the page closes.
//
// Anything with data-booth-open (or a link to #booth) opens it.

import { loadJSON, esc } from "/js/data.js";

const EMAIL = "haileyperng.acting@gmail.com";
const SITE = "haileyperng.github.io";
// Printed on every Polaroid's bottom border
const PRINT = { title: "Document more memories", lines: [EMAIL, SITE] };
const DEVELOP_MS = 5000;

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
        <a class="booth-book" href="#booth-seniors" data-jump>Senior photos ↓</a>
      </div>

      <div class="booth-scroll" data-scroll>
        <section class="booth-shoot">
          <div class="booth-cam">
            <div class="booth-finder">
              <canvas class="booth-view" width="720" height="720" data-view aria-label="Camera preview"></canvas>
              <div class="booth-message" data-message hidden></div>
              <div class="booth-count" data-count aria-live="assertive"></div>
            </div>
            <div class="booth-controls">
              <span class="label">Instant · 1 exposure</span>
              <button type="button" class="booth-shutter" data-shutter aria-label="Take a Polaroid" data-cursor-label="Snap"></button>
              <span class="label booth-counter" data-counter>0 shots</span>
            </div>
            <div class="booth-slot" aria-hidden="true"></div>
          </div>
          <div class="booth-tray" data-tray aria-label="Your Polaroids">
            <p class="booth-tray-empty label" data-empty>Your Polaroids land here.<br>They stay on this device.</p>
          </div>
        </section>

        <section class="booth-roll" data-roll aria-labelledby="booth-roll-title" hidden>
          <div class="booth-roll-head">
            <div>
              <p class="label">Roll 01 · 2020 – Now</p>
              <h3 id="booth-roll-title">How I got here</h3>
            </div>
            <div class="booth-roll-controls">
              <span class="label" data-roll-count></span>
              <button type="button" class="booth-roll-btn" data-roll-prev aria-label="Previous frame">←</button>
              <button type="button" class="booth-roll-btn" data-roll-next aria-label="Next frame">→</button>
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
                <text transform="translate(50 90) rotate(-90)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="500" fill="#0f0f10">HP 400 · ROLL 01</text>
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
          <p class="label booth-past-title">Past seniors</p>
          <div class="booth-past" data-past></div>
        </section>
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
  const tray = $("[data-tray]");
  const shutterBtn = $("[data-shutter]");
  const counter = $("[data-counter]");

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
  let shots = 0;
  let zTop = 1;

  loadJSON("/data/portraits.json").then(renderPast).catch(() => {});
  loadJSON("/data/timeline.json").then(initRoll).catch(() => {});

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
    else if (e.target.closest("[data-jump]")) {
      e.preventDefault();
      $("#booth-seniors").scrollIntoView({ behavior: "smooth" });
    }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") {
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
    if (!navigator.mediaDevices?.getUserMedia) return showMessage("This browser can't use a camera here. Scroll down for senior photo bookings.", false);
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
    } catch {
      showMessage("Camera is off. Allow camera access in your browser to take a Polaroid.", true);
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

  // Video → canvas: square cover-crop, mirrored like a selfie
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
    const photo = document.createElement("canvas");
    const size = Math.min(video.videoHeight || 720, 1080);
    photo.width = photo.height = size;
    draw(photo.getContext("2d"), size, size);
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const polaroid = await compose(photo, date);
    const url = URL.createObjectURL(await new Promise((r) => polaroid.toBlob(r, "image/jpeg", 0.92)));
    eject(url, photo.toDataURL("image/jpeg", 0.9), date);
    shots++;
    counter.textContent = `${shots} shot${shots === 1 ? "" : "s"}`;
    await wait(900);
    busy = false;
    root.classList.remove("is-busy");
  }

  // Full Polaroid for saving: photo, typed date, and contact info printed on the border
  async function compose(photo, date) {
    await document.fonts.load('40px "Special Elite"').catch(() => {});
    const W = 880, pad = 52, img = W - pad * 2, foot = 300, H = pad + img + foot;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#f7f6f1"; g.fillRect(0, 0, W, H);
    g.drawImage(photo, pad, pad, img, img);
    const y0 = pad + img;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#2a2a2c";
    g.font = '44px "Special Elite", "Courier New", monospace';
    g.fillText(date, W / 2, y0 + 70);
    g.strokeStyle = "#d4d3cc"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(pad + 60, y0 + 125); g.lineTo(W - pad - 60, y0 + 125); g.stroke();
    g.fillStyle = "#0f0f10";
    g.font = '34px "Special Elite", "Courier New", monospace';
    g.fillText(PRINT.title.toUpperCase(), W / 2, y0 + 170);
    g.fillStyle = "#5e6269";
    g.font = '26px "Special Elite", "Courier New", monospace';
    g.fillText(PRINT.lines.join("  ·  "), W / 2, y0 + 215);
    return c;
  }

  // A Polaroid slides out of the slot, then lands on the pile and develops
  function eject(saveUrl, imgSrc, date) {
    $("[data-empty]")?.remove();
    const el = document.createElement("figure");
    el.className = "polaroid is-ejecting";
    const rot = (Math.random() * 10 - 5).toFixed(1);
    const n = tray.querySelectorAll(".polaroid").length;
    el.style.setProperty("--r", `${rot}deg`);
    el.style.setProperty("--x", `${(Math.random() * 30 - 15).toFixed(0)}px`);
    el.style.setProperty("--y", `${Math.min(n, 6) * 14}px`);
    el.style.zIndex = ++zTop;
    el.innerHTML = `
      <div class="polaroid-img"><img src="${imgSrc}" alt="Your Polaroid from ${esc(date)}"><span class="polaroid-film"></span></div>
      <figcaption>
        <span class="polaroid-date">${esc(date)}</span>
        <span class="polaroid-print">
          <strong>${esc(PRINT.title)}</strong>
          <span><a href="mailto:${EMAIL}?subject=${encodeURIComponent("Senior photos")}">${EMAIL}</a> · <a href="/">${SITE}</a></span>
        </span>
      </figcaption>
      <div class="polaroid-actions">
        <a href="${saveUrl}" download="hailey-perng-polaroid-${Date.now()}.jpg">Save</a>
        <button type="button" data-remove>Remove</button>
      </div>`;
    tray.prepend(el);
    el.style.setProperty("--develop", `${DEVELOP_MS}ms`);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-developing")));
    setTimeout(() => el.classList.remove("is-ejecting"), 1400);
    el.addEventListener("pointerdown", () => (el.style.zIndex = ++zTop));
    el.querySelector("[data-remove]").addEventListener("click", () => {
      URL.revokeObjectURL(saveUrl);
      el.remove();
    });
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

  /* ------------------------------------------------------------ seniors */
  function renderPast(list) {
    $("[data-past]").innerHTML = list.map((p, i) => `
      <figure class="polaroid is-small" style="--r:${[-3, 2, -1.5, 3, -2.5, 1.5, -1, 2.5][i % 8]}deg">
        <div class="polaroid-img">${p.src ? `<img src="${esc(p.src)}" alt="${esc(p.alt || p.name)}" loading="lazy">` : `<span class="polaroid-ph label">Photo</span>`}</div>
        <figcaption>${esc(p.name)} ’${esc(String(p.year).slice(-2))}</figcaption>
      </figure>`).join("");
  }

  /* ------------------------------------------------------------ film roll
     Frames come from data/timeline.json. Wind it with the arrows, a click, a swipe or
     the arrow keys. The frame in the gate is developed; the rest stay negatives. */
  function initRoll(entries) {
    const section = $("[data-roll]");
    const view = $("[data-roll-view]");
    const track = $("[data-roll-track]");
    const film = $("[data-roll-film]");
    const caption = $("[data-roll-caption]");
    const count = $("[data-roll-count]");
    const prev = $("[data-roll-prev]");
    const next = $("[data-roll-next]");
    const pad = (n) => String(n).padStart(2, "0");
    const items = [...entries, { blank: true, year: "Next", title: "This roll isn't finished.", text: "Let's shoot the next one together." }];

    section.hidden = false;
    film.innerHTML = items.map((e, n) => `
      <button type="button" class="booth-roll-frame${e.blank ? " is-blank" : ""}" data-frame="${n}" aria-label="Frame ${n + 1}: ${esc(e.title)}">
        <span class="booth-roll-img">
          ${e.blank ? `<span class="label">Unexposed</span>` : e.src ? `<img src="${esc(e.src)}" alt="" loading="lazy" draggable="false">` : `<span class="booth-roll-ph">${esc(e.year)}</span>`}
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
      count.textContent = `Frame ${pad(current + 1)} / ${pad(items.length)}`;
      prev.disabled = current === 0;
      next.disabled = current === items.length - 1;
      caption.innerHTML = `
        <p class="label">${esc(e.year)}</p>
        <h4>${esc(e.title)}</h4>
        <p>${esc(e.text)}</p>
        ${e.blank ? `<a class="booth-pill is-dark" href="#booth-seniors" data-jump>Book your senior photos ↓</a>` : ""}`;
      place();
    }

    prev.addEventListener("click", () => go(current - 1));
    next.addEventListener("click", () => go(current + 1));
    film.addEventListener("click", (e) => {
      const f = e.target.closest("[data-frame]");
      if (f && !swiped) go(+f.dataset.frame);
    });
    section.addEventListener("keydown", (e) => {
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
