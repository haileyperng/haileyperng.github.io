// Home page: an exploded camera drawn like an engineering diagram.
// Each major part links to a section; gears, a film canister and screws are decoration.
// Positions and sizes live in css/components.css under "Home: exploded camera".
//
// To change what a part shows, edit PARTS below. To redraw a part, edit its SVG function.

const INK = "var(--ink)";
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

export const PARTS = [
  { id: "lens",       href: "/film/",        num: "01", part: "Lens assy.",  title: "Film",        blurb: "Moving images", svg: lens },
  { id: "aperture",   href: "/photography/", num: "02", part: "Aperture",    title: "Photography", blurb: "Still frames",  svg: aperture },
  { id: "viewfinder", href: "/about/",       num: "03", part: "Viewfinder",  title: "About",       blurb: "How I see",     svg: viewfinder },
  { id: "flash",      href: "/contact/",     num: "04", part: "Flash unit",  title: "Contact",     blurb: "Send a signal", svg: flash },
];

const DECOR = [
  { id: "gear-a", svg: () => gear(12, "url(#hp-metal)", "16s") },
  { id: "gear-b", svg: () => gear(9, "url(#hp-steel)", "11s", true) },
  { id: "gear-c", svg: () => gear(7, "url(#hp-metal)", "8s") },
  { id: "roll", svg: roll },
  { id: "screw-a", svg: screw },
  { id: "screw-b", svg: screw },
];

// Shared gradients/patterns, referenced by every part as url(#hp-...)
const DEFS = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hp-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f7f7f8"/><stop offset="0.45" stop-color="#cfd2d6"/>
        <stop offset="0.55" stop-color="#b6babf"/><stop offset="1" stop-color="#e4e6e8"/>
      </linearGradient>
      <linearGradient id="hp-metal-diag" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fafafa"/><stop offset="0.5" stop-color="#c3c6cb"/><stop offset="1" stop-color="#eceef0"/>
      </linearGradient>
      <linearGradient id="hp-steel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a7abb1"/><stop offset="0.5" stop-color="#686c73"/><stop offset="1" stop-color="#9ca0a6"/>
      </linearGradient>
      <radialGradient id="hp-glass" cx="0.35" cy="0.3" r="0.85">
        <stop offset="0" stop-color="#7b8088"/><stop offset="0.45" stop-color="#26282c"/><stop offset="1" stop-color="#09090a"/>
      </radialGradient>
      <pattern id="hp-leather" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#151516"/><circle cx="3" cy="3" r="1.1" fill="#2b2b2e"/>
      </pattern>
    </defs>
  </svg>`;

export function initCamera(stage) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lines = `<svg class="camera-lines" aria-hidden="true"></svg>`;

  const body = `
    <button class="part part--body" type="button" aria-label="Assemble or break apart the camera" data-cursor-label="Snap">
      <span class="part-inner">${cameraBody()}</span>
    </button>`;

  const decor = DECOR.map((d, i) => `
    <div class="part part--${d.id}" style="--i:${i + 4}" aria-hidden="true">
      <span class="part-inner">${d.svg()}</span>
    </div>`).join("");

  const links = PARTS.map((p, i) => `
    <a class="part part--${p.id}" href="${p.href}" style="--i:${i}" data-cursor-label="Open">
      <span class="part-inner">
        ${p.svg()}
        <span class="part-caption">
          <span class="label">${p.num} — ${p.part}</span>
          <strong>${p.title}</strong>
          <span class="label">${p.blurb}</span>
        </span>
      </span>
    </a>`).join("");

  stage.insertAdjacentHTML("afterbegin", DEFS + lines + decor + body + links);

  // Dash-dot lines from the body (center) to where each part ends up.
  const svg = stage.querySelector(".camera-lines");
  function drawLines() {
    let out = `<line class="axis" x1="0" y1="50%" x2="100%" y2="50%"/><line class="axis" x1="50%" y1="0" x2="50%" y2="100%"/>`;
    stage.querySelectorAll(".part:not(.part--body)").forEach((el) => {
      const cs = getComputedStyle(el);
      const x = 50 + parseFloat(cs.getPropertyValue("--x"));
      const y = 50 + parseFloat(cs.getPropertyValue("--y"));
      if (Number.isNaN(x) || Number.isNaN(y)) return;
      out += `<line x1="50%" y1="50%" x2="${x}%" y2="${y}%"/><circle cx="${x}%" cy="${y}%" r="3"/>`;
    });
    svg.innerHTML = out;
  }
  drawLines();
  addEventListener("resize", drawLines);

  const toggleBtn = stage.querySelector("[data-camera-toggle]");
  const set = (exploded) => {
    stage.classList.toggle("is-exploded", exploded);
    if (toggleBtn) toggleBtn.textContent = exploded ? "Assemble" : "Break apart";
  };
  const toggle = () => set(!stage.classList.contains("is-exploded"));

  stage.querySelector(".part--body").addEventListener("click", toggle);
  toggleBtn?.addEventListener("click", toggle);

  // Start assembled, then break apart.
  set(false);
  setTimeout(() => set(true), reduceMotion ? 0 : 500);
}

/* ---------------------------------------------------------------- SVG parts */

function cameraBody() {
  return `<svg viewBox="0 0 300 184" xmlns="http://www.w3.org/2000/svg">
    <rect x="108" y="8" width="84" height="36" rx="4" fill="url(#hp-metal)" ${S}/>
    <rect x="34" y="22" width="40" height="18" rx="3" fill="url(#hp-steel)" ${S}/>
    <rect x="226" y="18" width="32" height="22" rx="3" fill="url(#hp-metal)" ${S}/>
    <rect x="6" y="38" width="288" height="140" rx="12" fill="url(#hp-metal)" ${S}/>
    <rect x="6" y="74" width="288" height="72" fill="url(#hp-leather)" ${S}/>
    <circle cx="150" cy="108" r="50" fill="url(#hp-metal-diag)" ${S}/>
    <circle cx="150" cy="108" r="43" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="2 4"/>
    <circle cx="150" cy="108" r="34" fill="#0b0b0c"/>
    <text x="22" y="63" font-family="JetBrains Mono, monospace" font-size="10" font-weight="500" letter-spacing="1.5" fill="${INK}">HAILEY PERNG</text>
    <text x="214" y="63" font-family="JetBrains Mono, monospace" font-size="8" letter-spacing="1" fill="#5e6269">HP-001</text>
    <circle cx="20" cy="164" r="4" fill="none" stroke="${INK}" stroke-width="1.5"/>
    <circle cx="280" cy="164" r="4" fill="none" stroke="${INK}" stroke-width="1.5"/>
  </svg>`;
}

function lens() {
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="92" fill="#141415" ${S}/>
    <g class="spin-hover"><circle cx="100" cy="100" r="82" fill="none" stroke="#9a9ea5" stroke-width="10" stroke-dasharray="2 4"/></g>
    <circle cx="100" cy="100" r="72" fill="url(#hp-metal-diag)" ${S}/>
    <circle cx="100" cy="100" r="58" fill="#141415" ${S}/>
    <circle cx="100" cy="100" r="44" fill="url(#hp-glass)"/>
    <circle cx="86" cy="84" r="10" fill="#fff" opacity="0.7"/>
    <circle cx="112" cy="76" r="4" fill="#fff" opacity="0.45"/>
    <text x="100" y="22" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="7" letter-spacing="1" fill="#c8cbcf">50MM 1:1.4</text>
  </svg>`;
}

function aperture() {
  const pt = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return `${(100 + r * Math.cos(a)).toFixed(1)},${(100 + r * Math.sin(a)).toFixed(1)}`;
  };
  const blades = Array.from({ length: 6 }, (_, k) => {
    const a = k * 60, b = a + 60;
    const fill = k % 2 ? "url(#hp-steel)" : "url(#hp-metal-diag)";
    return `<polygon points="${pt(a, 26)} ${pt(b, 26)} ${pt(b + 55, 84)} ${pt(a + 55, 84)}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  }).join("");
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="92" fill="url(#hp-metal)" ${S}/>
    <g class="spin-hover">${blades}<circle cx="100" cy="100" r="22" fill="#0b0b0c"/></g>
    <circle cx="100" cy="100" r="92" fill="none" ${S}/>
    <circle cx="100" cy="100" r="86" fill="none" stroke="${INK}" stroke-width="1"/>
  </svg>`;
}

function viewfinder() {
  return `<svg viewBox="0 0 200 176" xmlns="http://www.w3.org/2000/svg">
    <rect x="72" y="8" width="56" height="34" rx="4" fill="#141415" ${S}/>
    <circle cx="100" cy="25" r="10" fill="url(#hp-glass)"/>
    <polygon points="28,166 172,166 136,42 64,42" fill="url(#hp-metal)" ${S}/>
    <polygon points="100,42 136,42 172,166 100,166" fill="#8f939a" opacity="0.35"/>
    <polygon points="28,166 172,166 136,42 64,42" fill="none" ${S}/>
    <circle cx="100" cy="118" r="20" fill="none" stroke="${INK}" stroke-width="2"/>
    <path d="M100 90v56M72 118h56" stroke="${INK}" stroke-width="1.5"/>
    <circle cx="100" cy="118" r="3" fill="${INK}"/>
  </svg>`;
}

function flash() {
  return `<svg viewBox="0 0 160 206" xmlns="http://www.w3.org/2000/svg">
    <rect x="52" y="168" width="56" height="30" rx="2" fill="url(#hp-steel)" ${S}/>
    <rect x="22" y="58" width="116" height="114" rx="8" fill="#141415" ${S}/>
    <rect x="10" y="8" width="140" height="56" rx="6" fill="url(#hp-metal)" ${S}/>
    <path d="M28 20v32M46 20v32M64 20v32M82 20v32M100 20v32M118 20v32M136 20v32" stroke="${INK}" stroke-width="1.5" opacity="0.3"/>
    <polygon points="88,78 54,124 78,124 70,156 106,106 82,106" fill="none" stroke="#e6e7e9" stroke-width="3" stroke-linejoin="round"/>
  </svg>`;
}

function gear(teeth, fill, speed, reverse = false) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, r] of [[0, 72], [step * 0.18, 92], [step * 0.5, 92], [step * 0.68, 72]]) {
      pts.push(`${(100 + r * Math.cos(a + da)).toFixed(1)},${(100 + r * Math.sin(a + da)).toFixed(1)}`);
    }
  }
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <g class="spin${reverse ? " spin-rev" : ""}" style="--speed:${speed}">
      <polygon points="${pts.join(" ")}" fill="${fill}" ${S}/>
      <circle cx="100" cy="100" r="50" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="3 5"/>
      <circle cx="100" cy="100" r="20" fill="var(--white)" ${S}/>
      <rect x="96" y="76" width="8" height="10" fill="${INK}"/>
    </g>
  </svg>`;
}

function roll() {
  const holes = Array.from({ length: 6 }, (_, i) => {
    const x = 92 + i * 17;
    return `<rect x="${x}" y="46" width="8" height="8" rx="1" fill="var(--white)"/><rect x="${x}" y="98" width="8" height="8" rx="1" fill="var(--white)"/>`;
  }).join("");
  return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <rect x="80" y="38" width="112" height="76" rx="2" fill="#2a2a2d" ${S}/>
    ${holes}
    <rect x="34" y="6" width="20" height="16" rx="2" fill="url(#hp-steel)" ${S}/>
    <rect x="12" y="20" width="66" height="112" rx="8" fill="#141415" ${S}/>
    <rect x="12" y="20" width="66" height="16" rx="4" fill="url(#hp-metal)" ${S}/>
    <rect x="12" y="116" width="66" height="16" rx="4" fill="url(#hp-metal)" ${S}/>
    <text x="45" y="82" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="500" fill="#e6e7e9">35</text>
  </svg>`;
}

function screw() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="42" fill="url(#hp-metal-diag)" ${S}/>
    <path d="M30 50h40M50 30v40" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  </svg>`;
}
