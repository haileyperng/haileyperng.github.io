// Lightbox: links with [data-lightbox] inside `container` open full-size.
// Arrow keys move between images, Escape closes.

export function initLightbox(container) {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.innerHTML = `<button class="lightbox-close label" aria-label="Close">Close ×</button><img alt="">`;
  document.body.append(box);
  const img = box.querySelector("img");
  let links = [], index = 0;

  function show(i) {
    index = (i + links.length) % links.length;
    img.src = links[index].getAttribute("href");
    img.alt = links[index].dataset.alt || "";
    box.hidden = false;
  }
  const close = () => { box.hidden = true; img.removeAttribute("src"); };

  container.addEventListener("click", (e) => {
    const a = e.target.closest("[data-lightbox]");
    if (!a) return;
    e.preventDefault();
    links = [...container.querySelectorAll("[data-lightbox]")];
    show(links.indexOf(a));
  });
  box.addEventListener("click", (e) => { if (e.target !== img) close(); });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") show(index + 1);
    if (e.key === "ArrowLeft") show(index - 1);
  });
}
