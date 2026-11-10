# haileyperng.github.io

Film and photography portfolio, published with GitHub Pages at https://haileyperng.github.io.
Plain HTML, CSS and JavaScript: no build step. Push to `main` and the site updates in a minute or two.

## Pages

| URL | File | What it is |
| --- | --- | --- |
| `/` | `index.html` | Home: an exploded a6700-style camera with a Build mode; clicking it opens it up |
| `/#booth` | `js/photobooth.js` | Photo Booth: webcam shots wound onto a film camera, a roll of senior photos, and booking info |
| `/about/#purpose` | `about/index.html` | "What keeps me charged": energy, goal, purpose (the camera's battery links here) |
| `/film/` | `film/index.html` | One grid of all films (from `data/films.json`) |
| `/film/project.html?id=…` | `film/project.html` | One film (template filled from `data/films.json`) |
| `/photography/` | `photography/index.html` | One grid of all photos (from `data/photos.json`); click to enlarge |
| `/about/` | `about/index.html` | Bio, experience, education, recognition, kit |
| `/contact/` | `contact/index.html` | Email, links, local time |
| any missing URL | `404.html` | Not-found page |

## Code

- `css/base.css`: colors, fonts, spacing (edit the `:root` block to restyle everything)
- `css/components.css`: header, footer, camera, browsing views, detail pages, cursor
- `js/site.js`: runs on every page; builds the header and footer, starts the clock and cursor
- `js/cursor.js`: crosshair cursor. Add `data-cursor-label="Word"` to any element to show a word in the ring
- `js/camera3d.js`: the home page's 3D exploded camera (three.js, loaded from a CDN via the import map in `index.html`).
  `SECTIONS` sets which part links where and what its callout says; `STEPS` is the Build-mode checklist
- `js/photobooth.js`: the Photo Booth window. Photos stay in the visitor's browser; nothing is uploaded
- `js/camera.js`: 2D drawing of the camera, used automatically if a browser can't run 3D
- `js/lightbox.js`: full-size photo viewer on the Photography page
- `js/data.js`: helpers for loading the JSON content

## Adding work

**A film:** add an entry to `data/films.json` (copy an existing one, give it a unique `id`).
Leave any detail blank (`""`) and it is simply not shown.
Set `embed` to a Vimeo/YouTube embed URL, e.g. `https://player.vimeo.com/video/123456`,
and `thumbnail` to an image path like `/assets/film/my-film.jpg`.

**Photos:** add an entry to `data/photos.json` for each photo, in the order they should appear.
Put images in `assets/photography/` and give each `src`, `alt` and `aspect` (e.g. `"4 / 5"`).

**Senior photos:** edit `data/portraits.json`. Each senior is one exposure on the roll in the Photo Booth.
Set `cover` to the photo shown on the film and list every photo from the session under `photos`,
with paths like `/assets/seniors/adriana-01.jpg`. Without a `cover`, the first photo is used.

## Previewing locally

The pages load JSON, so open them through a local server rather than double-clicking the file:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.
