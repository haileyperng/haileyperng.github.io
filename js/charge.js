// About page battery: glide across it (mouse), drag (touch) or use arrow keys to charge it.
// The fill follows the pointer; each <li data-at="N"> unlocks once the charge reaches N%
// and stays unlocked, so you can move away and read.
// Without JavaScript every level is simply shown.

export function initCharge(root) {
  const cell = root.querySelector(".charge-cell");
  const body = root.querySelector(".charge-body");
  const pctEl = root.querySelector(".charge-pct");
  const marks = root.querySelector(".charge-marks");
  const status = root.querySelector("[data-charge-status]");
  const levels = [...root.querySelectorAll("li[data-at]")].map((li) => ({ li, at: +li.dataset.at }));

  root.classList.add("is-interactive");
  marks.innerHTML = levels.map((l) => `<span style="left:${l.at}%"></span>`).join("");
  const markEls = [...marks.children];

  let pct = 0, best = 0, raf = 0;

  function set(v) {
    pct = Math.max(0, Math.min(100, Math.round(v)));
    best = Math.max(best, pct);
    if (!raf) raf = requestAnimationFrame(render);
  }

  function render() {
    raf = 0;
    root.style.setProperty("--pct", pct);
    pctEl.textContent = `${pct}%`;
    cell.setAttribute("aria-valuenow", pct);
    const unlocked = levels.filter((l) => best >= l.at).length;
    cell.setAttribute("aria-valuetext", `${pct}%, ${unlocked} of ${levels.length} unlocked`);
    levels.forEach((l, i) => {
      const on = best >= l.at;
      if (on && !l.li.classList.contains("is-on")) {
        l.li.classList.add("is-on", "is-new");
        setTimeout(() => l.li.classList.remove("is-new"), 600);
      }
      markEls[i].classList.toggle("is-on", pct >= l.at);
    });
    const next = levels.find((l) => best < l.at);
    root.classList.toggle("is-full", best >= 100);
    status.textContent = best >= 100 ? "Fully charged" : next ? `Charge to ${next.at}% to unlock more` : "";
  }

  const fromPointer = (e) => {
    const r = body.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };

  // Mouse: just glide across. Touch / pen: press and drag.
  cell.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" || e.buttons) fromPointer(e); });
  cell.addEventListener("pointerdown", (e) => { fromPointer(e); if (e.pointerType !== "mouse") cell.setPointerCapture(e.pointerId); });

  cell.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 20, PageDown: -20 }[e.key];
    if (step) { e.preventDefault(); set(pct + step); }
    else if (e.key === "Home") { e.preventDefault(); set(0); }
    else if (e.key === "End") { e.preventDefault(); set(100); }
  });

  render();
}
