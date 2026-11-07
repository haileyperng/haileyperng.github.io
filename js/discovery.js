// Discovery: one collection, several ways to browse it.
//   Grid    - classic thumbnail grid
//   List    - index of titles; hovering a row shows a preview that follows the cursor
//   Explore - items scattered on a canvas that visitors can drag around
// Plus tag filters and a shuffle button. The chosen view is remembered per collection.
//
// To add a new view: write a render function below and add a button with data-view="name".

import { esc, mediaHTML } from "/js/data.js";

export function initDiscovery({ root, items, hrefFor, metaFor, cursorLabel = "View", storageKey }) {
  const stage = root.querySelector("[data-stage]");
  const filterBar = root.querySelector("[data-filters]");
  const viewBar = root.querySelector("[data-views]");
  const countEl = root.querySelector("[data-count]");
  const views = { grid: renderGrid, list: renderList, scatter: renderScatter };

  let view = readStore(storageKey);
  if (!views[view]) view = "grid";
  let tag = "all";
  let order = items.slice();

  const tags = ["all", ...new Set(items.flatMap((i) => i.tags || []))];
  filterBar.innerHTML = tags.map((t) => `<button class="chip" data-tag="${esc(t)}">${esc(t)}</button>`).join("");

  filterBar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]");
    if (!b) return;
    tag = b.dataset.tag;
    render();
  });
  viewBar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    view = b.dataset.view;
    writeStore(storageKey, view);
    render();
  });
  root.querySelector("[data-shuffle]")?.addEventListener("click", () => {
    order = shuffle(order);
    render();
  });

  function render() {
    filterBar.querySelectorAll("[data-tag]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tag === tag));
    viewBar.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === view));
    const list = order.filter((i) => tag === "all" || (i.tags || []).includes(tag));
    if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? "work" : "works"}`;
    stage.className = `discovery-stage view-${view}`;
    stage.innerHTML = "";
    stage.onpointermove = stage.onpointerleave = null;
    if (!list.length) {
      stage.innerHTML = `<p class="empty">Nothing tagged “${esc(tag)}” yet.</p>`;
      return;
    }
    views[view](list);
  }

  const media = (item) => mediaHTML({ src: item.thumbnail, alt: item.title, aspect: item.aspect, label: item.title });
  const info = (item) => `
    <div class="card-info">
      <span class="card-title">${esc(item.title)}</span>
      <span class="label">${esc(item.year)}</span>
    </div>
    <p class="label">${esc(metaFor(item))}</p>`;

  function renderGrid(list) {
    stage.innerHTML = list.map((item) => `
      <a class="card" href="${hrefFor(item)}" data-cursor-label="${esc(cursorLabel)}">
        <div class="card-media">${media(item)}</div>
        ${info(item)}
      </a>`).join("");
  }

  function renderList(list) {
    stage.innerHTML = list.map((item, i) => `
      <a class="row" href="${hrefFor(item)}" data-index="${i}">
        <span class="label">${String(i + 1).padStart(2, "0")}</span>
        <span class="row-title">${esc(item.title)}</span>
        <span class="label row-meta">${esc(metaFor(item))}</span>
        <span class="label">${esc(item.year)}</span>
      </a>`).join("");

    if (!matchMedia("(hover: hover)").matches) return;
    const preview = document.createElement("div");
    preview.className = "list-preview";
    preview.setAttribute("aria-hidden", "true");
    stage.append(preview);
    let current = -1;
    stage.onpointermove = (e) => {
      const row = e.target.closest(".row");
      if (!row) return preview.classList.remove("is-visible");
      const i = Number(row.dataset.index);
      if (i !== current) { current = i; preview.innerHTML = media(list[i]); }
      preview.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 80}px)`;
      preview.classList.add("is-visible");
    };
    stage.onpointerleave = () => preview.classList.remove("is-visible");
  }

  function renderScatter(list) {
    stage.innerHTML = list.map((item) => `
      <a class="scatter-item" href="${hrefFor(item)}" draggable="false" data-cursor-label="Drag"
         style="left:${rand(2, 78)}%; top:${rand(2, 70)}%; z-index:${Math.floor(rand(1, 50))}">
        ${media(item)}
        <div class="card-info"><span class="card-title">${esc(item.title)}</span><span class="label">${esc(item.year)}</span></div>
      </a>`).join("") + `<p class="label scatter-hint">Drag to rearrange · click to open</p>`;

    let top = 100;
    stage.querySelectorAll(".scatter-item").forEach((el) => {
      let startX, startY, originL, originT, moved = false;
      el.addEventListener("pointerdown", (e) => {
        startX = e.clientX; startY = e.clientY; moved = false;
        originL = el.offsetLeft; originT = el.offsetTop;
        el.style.zIndex = ++top;
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
      });
      el.addEventListener("pointermove", (e) => {
        if (!el.hasPointerCapture(e.pointerId)) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        el.style.left = `${originL + dx}px`;
        el.style.top = `${originT + dy}px`;
      });
      el.addEventListener("pointerup", () => el.classList.remove("is-dragging"));
      el.addEventListener("click", (e) => { if (moved) e.preventDefault(); });
    });
  }

  render();
}

function rand(min, max) { return min + Math.random() * (max - min); }
function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
function readStore(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeStore(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }
