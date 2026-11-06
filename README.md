# haileyperng.github.io

Film and photography portfolio, published with GitHub Pages at https://haileyperng.github.io.

## Structure

- `index.html` — the whole site (Film, Photography, About, Contact sections)
- `css/style.css` — styles (colors and fonts are at the top in `:root`)
- `js/main.js` — photo lightbox
- `images/photography/` — put your photos here

## Adding work

**A photo:** drop the file in `images/photography/`, then in the Photography section of `index.html` replace a placeholder with:

```html
<a class="photo" href="images/photography/my-photo.jpg">
  <img src="images/photography/my-photo.jpg" alt="Short description" loading="lazy">
</a>
```

Add `tall` or `wide` to the class for a larger tile.

**A film:** in a `.film-card`, replace `<div class="frame placeholder">Video embed</div>` with:

```html
<div class="frame"><iframe src="https://player.vimeo.com/video/VIDEO_ID" allowfullscreen></iframe></div>
```

(For YouTube use `https://www.youtube.com/embed/VIDEO_ID`.)

## Publishing

Commit and push to `main`; GitHub Pages rebuilds the site within a minute or two.
