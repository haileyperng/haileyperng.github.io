// Content lives in /data/*.json so pages render from one source of truth.

export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// An <img> if a source is given, otherwise a labelled placeholder box.
export function mediaHTML({ src, alt = "", aspect = "4 / 3", label = "" }) {
  const style = `style="--ar:${esc(aspect)}"`;
  return src
    ? `<img class="media" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" ${style}>`
    : `<div class="ph" ${style}>${esc(label)}</div>`;
}

export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}
