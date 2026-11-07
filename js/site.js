// Shared setup for every page: header, footer, live clock, custom cursor.
// Each page includes: <script type="module" src="/js/site.js"></script>
import { initCursor } from "/js/cursor.js";

const NAV = [
  { href: "/film/", label: "Film" },
  { href: "/photography/", label: "Photography" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
];

function renderHeader() {
  const el = document.querySelector("[data-site-header]");
  if (!el) return;
  const path = location.pathname;
  el.innerHTML = `
    <a class="site-logo" href="/">Hailey Perng</a>
    <nav class="site-nav" aria-label="Main">
      ${NAV.map((n, i) => `<a href="${n.href}"${path.startsWith(n.href) ? ' aria-current="page"' : ""}><span class="nav-num">0${i + 1}</span>${n.label}</a>`).join("")}
    </nav>`;
}

function renderFooter() {
  const el = document.querySelector("[data-site-footer]");
  if (!el) return;
  el.innerHTML = `
    <span class="label">© ${new Date().getFullYear()} Hailey Perng</span>
    <span class="label">Los Angeles · <time data-clock></time></span>
    <a class="label" href="#top">Back to top ↑</a>`;
}

// Any element with [data-clock] shows the current Los Angeles time.
function startClock() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", second: "2-digit",
  });
  const tick = () => document.querySelectorAll("[data-clock]").forEach((t) => (t.textContent = fmt.format(new Date())));
  tick();
  setInterval(tick, 1000);
}

renderHeader();
renderFooter();
startClock();
initCursor();
