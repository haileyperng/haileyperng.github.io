document.getElementById("year").textContent = new Date().getFullYear();

// Lightbox: click any photo that links to an image file to view it full-size.
const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector("img");

document.querySelectorAll(".photo").forEach((link) => {
  link.addEventListener("click", (e) => {
    const href = link.getAttribute("href");
    if (!/\.(jpe?g|png|webp|gif|avif)$/i.test(href)) return;
    e.preventDefault();
    lightboxImg.src = href;
    lightboxImg.alt = link.querySelector("img")?.alt || "";
    lightbox.hidden = false;
  });
});

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = "";
}
lightbox.addEventListener("click", (e) => {
  if (e.target !== lightboxImg) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});
