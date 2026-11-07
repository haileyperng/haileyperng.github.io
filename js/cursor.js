// Custom cursor: a crosshair that tracks the pointer and a ring that trails behind.
//  - Links and buttons grow the ring.
//  - Add data-cursor-label="Watch" (any text) to an element to show that word in the ring.
//  - Elements marked data-cursor-managed set the label themselves via setCursorLabel()
//    (used by the 3D camera, where the hovered thing changes without leaving the canvas).
//  - Sets --mx / --my (0..1) on <html> so CSS can react to the pointer.
// Only runs on devices with a mouse/trackpad.

let ring = null;
let label = null;

export function setCursorLabel(text = "", hover = !!text) {
  if (!ring) return;
  ring.classList.toggle("is-hover", hover);
  ring.classList.toggle("has-label", !!text);
  label.textContent = text;
}

export function initCursor() {
  const root = document.documentElement;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Pointer position for CSS, even when the custom cursor is off.
  addEventListener("pointermove", (e) => {
    root.style.setProperty("--mx", (e.clientX / innerWidth).toFixed(3));
    root.style.setProperty("--my", (e.clientY / innerHeight).toFixed(3));
  }, { passive: true });

  if (!finePointer) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dot = document.createElement("div");
  ring = document.createElement("div");
  label = document.createElement("span");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  label.className = "cursor-label";
  ring.append(label);
  document.body.append(dot, ring);
  root.classList.add("has-custom-cursor", "cursor-out");

  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;

  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    root.classList.remove("cursor-out");
  }, { passive: true });
  document.addEventListener("pointerleave", () => root.classList.add("cursor-out"));

  (function follow() {
    const k = reduceMotion ? 1 : 0.18;
    rx += (x - rx) * k;
    ry += (y - ry) * k;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  })();

  document.addEventListener("pointerover", (e) => {
    if (e.target.closest("[data-cursor-managed]")) return;
    const target = e.target.closest("a, button, [data-cursor-label]");
    const text = target?.closest("[data-cursor-label]")?.dataset.cursorLabel || "";
    setCursorLabel(text, !!target);
  });
}
