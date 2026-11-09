// Home page: "How I got here", a strip of film you scroll down.
//  - Frames come from data/timeline.json. Add a photo by setting "src" on an entry.
//  - Each frame starts as a negative and develops as it reaches the middle of the screen,
//    then stays developed.

import { loadJSON, esc } from "/js/data.js";

export async function initRoll(root) {
  const list = root.querySelector("[data-roll-list]");
  const hud = root.querySelector("[data-roll-hud]");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let entries;
  try { entries = await loadJSON("/data/timeline.json"); }
  catch { root.hidden = true; return; }

  const pad = (n) => String(n).padStart(2, "0");
  const total = entries.length + 1;   // + the unexposed last frame

  list.querySelector(".roll-hud-wrap").insertAdjacentHTML("afterend", entries.map((e, i) => `
    <li class="roll-item">
      <div class="roll-film">
        <div class="roll-frame">
          ${e.src ? `<img src="${esc(e.src)}" alt="${esc(e.alt || e.title)}" loading="lazy">` : `<span class="roll-ph">${esc(e.year)}</span>`}
        </div>
        <p class="roll-edge" aria-hidden="true"><span>HP 400</span><span>▸ ${i + 1}A</span></p>
      </div>
      <div class="roll-caption">
        <p class="label">Frame ${pad(i + 1)} · ${esc(e.year)}</p>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.text)}</p>
      </div>
    </li>`).join(""));

  const items = [...list.querySelectorAll(".roll-item")].map((el, i) => ({
    el, neg: reduceMotion ? 0 : 1, year: entries[i]?.year ?? "Next",
  }));

  let raf = 0;
  const smooth = (x) => x * x * (3 - 2 * x);

  function update() {
    raf = 0;
    const vh = innerHeight, mid = vh / 2;
    let current = -1, best = Infinity;
    items.forEach((it, i) => {
      const r = it.el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const dist = Math.abs(center - mid);
      if (dist < best) { best = dist; current = i; }
      if (reduceMotion) { it.el.style.setProperty("--neg", 0); return; }
      // Develop on the way to the middle; frames you've passed stay developed
      const k = center < mid ? 0 : Math.min(1, Math.max(0, (center - mid * 1.05) / (mid * 0.75)));
      it.neg = Math.min(it.neg, smooth(k));
      it.el.style.setProperty("--neg", it.neg.toFixed(3));
    });
    if (hud && current >= 0) hud.textContent = `Frame ${pad(current + 1)} / ${pad(total)} · ${items[current].year}`;
  }

  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  update();
}
