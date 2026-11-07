# haileyperng.github.io

Film and photography portfolio, published with GitHub Pages at https://haileyperng.github.io.
Plain HTML, CSS and JavaScript: no build step. Push to `main` and the site updates in a minute or two.

## Pages

| URL | File | What it is |
| --- | --- | --- |
| `/` | `index.html` | Home: an exploded camera; each part opens a section |
| `/film/` | `film/index.html` | All films, with Grid / List / Explore views and tag filters |
| `/film/project.html?id=…` | `film/project.html` | One film (template filled from `data/films.json`) |
| `/photography/` | `photography/index.html` | All photo series, same browsing views |
| `/photography/series.html?id=…` | `photography/series.html` | One series (template filled from `data/photos.json`) |
| `/about/` | `about/index.html` | Bio, experience, education, recognition, kit |
| `/contact/` | `contact/index.html` | Email, links, local time |
| any missing URL | `404.html` | Not-found page |

## Code

- `css/base.css`: colors, fonts, spacing (edit the `:root` block to restyle everything)
- `css/components.css`: header, footer, camera, browsing views, detail pages, cursor
- `js/site.js`: runs on every page; builds the header and footer, starts the clock and cursor
- `js/cursor.js`: crosshair cursor. Add `data-cursor-label="Word"` to any element to show a word in the ring
- `js/camera3d.js`: the home page's 3D exploded camera (three.js, loaded from a CDN via the import map in `index.html`).
  `SECTIONS` sets which part links where and what its callout says; each part is built from simple shapes below it
- `js/camera.js`: 2D drawing of the camera, used automatically if a browser can't run 3D
- `js/discovery.js`: Grid / List / Explore views, filters and shuffle for Film and Photography
- `js/lightbox.js`: full-size photo viewer on series pages
- `js/data.js`: helpers for loading the JSON content

## Adding work

**A film:** add an entry to `data/films.json` (copy an existing one, give it a unique `id`).
Set `embed` to a Vimeo/YouTube embed URL, e.g. `https://player.vimeo.com/video/123456`,
and `thumbnail` to an image path like `/assets/film/my-film.jpg`.

**A photo series:** add an entry to `data/photos.json`. Put images in `assets/photography/`
and list them under `images` with `src`, `alt` and `aspect` (e.g. `"4 / 5"`).

Tags in either file become the filter buttons automatically.

## Previewing locally

The pages load JSON, so open them through a local server rather than double-clicking the file:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.
