/* ==========================================================================
   main.js  —  The small amount of JavaScript the site needs.
   You normally never need to edit this file.

   It does 4 things:
   1. Opens/closes the menu on phones when you tap the ☰ button.
   2. Highlights the current page in the menu.
   3. If an image file is missing, shows a grey box with the expected
      file name (so you know what to upload).
   4. When a link jumps to an entry (e.g. /projects#securegrid), places
      that entry's title just below the menu bar, even after pictures
      and videos above it finish loading.
   5. "Filter by Topic" menu on the Publications page.
   7. News box on the Home page: shows 7½ items and scrolls for the rest.
   ========================================================================== */

// Preserve existing bookmarks while displaying the same clean page addresses
// used by the other menu items. Keep any search query and section anchor.
(function () {
  var url = new URL(window.location.href);
  if (/\/(contact|search)\.html$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\.html$/i, "");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
})();

document.addEventListener("DOMContentLoaded", function () {

  /* ---- 1. Phone menu (☰ button) ---- */
  var toggle = document.querySelector(".menu-toggle");
  var links  = document.querySelector(".nav-links");

  // Add Contact to every page without editing the existing HTML page files.
  // The check also avoids a duplicate on contact.html, which already has it.
  if (links && !links.querySelector('a[href="/contact"], a[href="/contact.html"]')) {
    var contactItem = document.createElement("li");
    var contactLink = document.createElement("a");
    contactLink.href = "/contact";
    contactLink.textContent = "Contact";
    contactItem.appendChild(contactLink);
    links.appendChild(contactItem);
  }
  if (links) {
    links.querySelectorAll('a[href="/contact.html"]').forEach(function (a) { a.setAttribute("href", "/contact"); });
  }

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen);
      toggle.textContent = isOpen ? "✕" : "☰";
    });
  }

  /* ---- 2. Highlight the current page in the menu ---- */
  //    Works with clean addresses like /projects as well as /projects.html
  function pageName(path) {
    var name = path.split("/").pop().replace(".html", "");
    return name === "" ? "index" : name;
  }
  var current = pageName(window.location.pathname);
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    if (pageName(a.getAttribute("href")) === current) a.classList.add("active");
  });

  /* ---- 3. Show a helpful box when an image has not been uploaded yet ---- */
  function showMissing(img) {
    var box = document.createElement("div");
    box.className = "img-missing " + img.className;
    box.textContent = "Add image: " + img.getAttribute("src");
    img.replaceWith(box);
  }
  //    (only for your own files, not for outside images like the Flag Counter)
  document.querySelectorAll("img:not([src^='http'])").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) {
      showMissing(img);               // already failed before this script ran
    } else {
      img.addEventListener("error", function () { showMissing(img); });
    }
  });
});

/* ---- 4. Jump links: put the entry just below the menu bar ---- */
function alignToHash() {
  if (!window.location.hash) return;
  var target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) return;
  var header = document.querySelector(".site-header");
  var gap = (header ? header.offsetHeight : 0) + 16;   // menu bar height + small space
  var top = target.getBoundingClientRect().top + window.pageYOffset - gap;
  window.scrollTo({ top: top, behavior: "auto" });
}
// Run once everything (pictures, video, fonts) has loaded, and once more a
// moment later in case something still changed size.
window.addEventListener("load", function () {
  alignToHash();
  setTimeout(alignToHash, 600);
});
// Also when a jump link is clicked while already on the same page.
window.addEventListener("hashchange", alignToHash);

/* ---- 5. Publications page: "Filter by Topic" menu ---- */
document.addEventListener("DOMContentLoaded", function () {
  var filter = document.getElementById("topic-filter");
  if (!filter) return;                       // only on the Publications page
  function applyFilter() {
    var topic = filter.value;                // "all", "detection", ...
    document.querySelectorAll("[data-topics]").forEach(function (card) {
      var topics = card.getAttribute("data-topics").split(" ");
      card.hidden = !(topic === "all" || topics.indexOf(topic) !== -1);
    });
    // hide a whole section (e.g. "Thesis") when none of its papers match
    document.querySelectorAll("main .section").forEach(function (section) {
      var cards = section.querySelectorAll("[data-topics]");
      if (!cards.length) return;
      var anyShown = Array.prototype.some.call(cards, function (c) { return !c.hidden; });
      section.hidden = !anyShown;
    });
  }
  filter.addEventListener("change", applyFilter);
  applyFilter();
});

/* ---- 6. Website search: header control and precise result destinations ---- */
(function () {
  var script = document.currentScript;
  var siteBase = new URL("../", script && script.src ? script.src : new URL("js/main.js", window.location.href).href);
  var searchUrl = new URL("search", siteBase);

  function loadSearchCore(callback) {
    if (window.SiteSearch) { callback(); return; }
    var loader = document.getElementById("site-search-core-script");
    if (!loader) {
      loader = document.createElement("script");
      loader.id = "site-search-core-script";
      loader.src = new URL("js/search-core.js", siteBase).href;
      loader.async = true;
      loader.addEventListener("load", callback, { once: true });
      document.head.appendChild(loader);
    } else loader.addEventListener("load", callback, { once: true });
  }
  function revealSearchTarget() {
    if (!window.location.hash) return;
    var params = new URLSearchParams(window.location.search);
    if (!params.has("search") && !window.location.hash.startsWith("#site-search-")) return;
    loadSearchCore(function () {
      if (!window.SiteSearch) return;
      window.SiteSearch.assignAnchors(document);
      var id;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { return; }
      var target = document.getElementById(id);
      if (!target) return;
      var filter = document.getElementById("topic-filter");
      if (filter && filter.value !== "all") { filter.value = "all"; filter.dispatchEvent(new Event("change", { bubbles: true })); }
      target.querySelectorAll("details").forEach(function (details) { details.open = true; });
      target.classList.add("site-search-hit");
      alignToHash();
    });
  }
  function setupSearch() {
    var header = document.querySelector(".site-header");
    var container = header && header.querySelector(".container");
    if (!container) return;
    if (!document.getElementById("site-search-style")) {
      var css = document.createElement("link");
      css.id = "site-search-style"; css.rel = "stylesheet";
      css.href = new URL("css/search.css", siteBase).href;
      document.head.appendChild(css);
    }
    header.classList.add("has-site-search");
    if (!document.getElementById("site-search-trigger")) {
      var link = document.createElement("a");
      link.id = "site-search-trigger"; link.className = "site-search-trigger";
      link.href = searchUrl.href;
      link.setAttribute("aria-label", "Search this website");
      link.setAttribute("aria-keyshortcuts", "/");
      link.title = "Search this website (press /)";
      if (window.location.pathname.replace(/\.html$/, "").replace(/\/$/, "") === searchUrl.pathname.replace(/\.html$/, "")) link.setAttribute("aria-current", "page");
      // Fixed decorative SVG; no user-provided HTML is inserted.
      link.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path></svg><span class="site-search-accessible">Search</span>';
      container.appendChild(link);
    }
    document.addEventListener("keydown", function (event) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (event.target.closest && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      var input = document.getElementById("search-query");
      if (input) input.focus(); else window.location.assign(searchUrl.href);
    });
    revealSearchTarget();
    window.addEventListener("hashchange", revealSearchTarget);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupSearch);
  else setupSearch();
})();

/* ---- 7. News box (Home page): show exactly 7½ items, scroll for the rest ---- */
(function () {
  // How many news items show at once (computers/tablets, and phones)
  var VISIBLE_WIDE = 7.5, VISIBLE_PHONE = 4.5;
  function setup() {
    var box = document.querySelector(".news-scroll");
    if (!box) return;                                  // only on the Home page
    var items = box.querySelectorAll(".news-list li");
    var hint = document.querySelector(".news-hint");
    function size() {
      var VISIBLE = window.innerWidth <= 760 ? VISIBLE_PHONE : VISIBLE_WIDE;
      if (items.length <= VISIBLE) {                   // few items: no scrolling needed
        box.style.maxHeight = "none";
        box.classList.add("at-end");
        if (hint) hint.classList.add("hidden");
        return;
      }
      var whole = Math.floor(VISIBLE), h = 0;
      for (var i = 0; i < whole; i++) h += items[i].offsetHeight;
      h += items[whole].offsetHeight * (VISIBLE - whole);   // the half item
      box.style.maxHeight = Math.round(h) + "px";
      update();
    }
    function update() {
      var end = box.scrollTop + box.clientHeight >= box.scrollHeight - 4;
      box.classList.toggle("at-end", end);
      if (hint) hint.classList.toggle("hidden", end);
    }
    box.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", size);
    window.addEventListener("load", size);             // re-measure after fonts load
    size();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();

