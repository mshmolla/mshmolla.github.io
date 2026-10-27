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
   7. News box on the Home page: shows 5½ items and scrolls for the rest.
   9. Loads the other pages in the background so clicks open instantly.
  10. Pictures fade in softly.  11. Jump links glide to the entry.
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
function alignToHash(smooth) {
  if (!window.location.hash) return;
  var target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) return;
  var header = document.querySelector(".site-header");
  var gap = (header ? header.offsetHeight : 0) + 16;   // menu bar height + small space
  var top = target.getBoundingClientRect().top + window.pageYOffset - gap;
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: top, behavior: (smooth === true && !calm) ? "smooth" : "auto" });
}
// Run once everything (pictures, video, fonts) has loaded, and once more a
// moment later in case something still changed size.
window.addEventListener("load", function () {
  if (alignToHash.glide) return;           // section 11 glides there instead
  alignToHash();
  setTimeout(alignToHash, 600);
});
// Also when a jump link is clicked while already on the same page.
window.addEventListener("hashchange", function () { alignToHash(true); });

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
      loader.src = new URL("js/search-core.js?v=5", siteBase).href;
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
      css.href = new URL("css/search.css?v=6", siteBase).href;
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
  var VISIBLE_WIDE = 5.5, VISIBLE_PHONE = 4.5;
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


/* ---- 8. Light YouTube player: load the real video only when clicked ---- */
document.addEventListener("click", function (event) {
  var btn = event.target.closest && event.target.closest(".yt-lite");
  if (!btn) return;
  var frame = document.createElement("iframe");
  frame.src = "https://www.youtube-nocookie.com/embed/" + btn.dataset.id + "?autoplay=1&rel=0";
  frame.title = btn.dataset.title || "YouTube video";
  frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  frame.allowFullscreen = true;
  btn.replaceWith(frame);
});

/* ---- 9. Faster browsing: while a visitor reads this page, quietly load
         the other pages and their pictures in the background, so the next
         click opens instantly. Also loads any not-yet-shown pictures on this
         page, so nothing "pops in" while scrolling. Skipped on data-saver /
         very slow connections. ---- */
(function () {
  var conn = navigator.connection || {};
  if (conn.saveData || /2g/.test(conn.effectiveType || "")) return;

  var PAGES = ["/", "/projects", "/publications", "/experience", "/education", "/contact"];
  var done = {};

  function warmImage(src) {
    if (!src || done[src] || /^data:/.test(src)) return;
    done[src] = true;
    var img = new Image();
    img.decoding = "async";
    img.src = src;
  }
  function prefetchPage(path) {
    var url = new URL(path, location.href).href;
    if (done[url] || url.split("#")[0] === location.href.split("#")[0]) return;
    done[url] = true;
    fetch(url, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("link[rel=stylesheet][href^='css/']").forEach(function (l) {
          fetch(new URL(l.getAttribute("href"), url).href).catch(function () {});
        });
        doc.querySelectorAll("img[src]").forEach(function (im) {
          var s = im.getAttribute("src");
          if (!/^https?:/.test(s)) warmImage(new URL(s, url).href);   // own pictures only
        });
      }).catch(function () {});
  }
  function whenIdle(fn) { (window.requestIdleCallback || function (f) { setTimeout(f, 1200); })(fn); }

  window.addEventListener("load", function () {
    // 1. finish loading this page's remaining pictures
    whenIdle(function () {
      document.querySelectorAll("img[loading=lazy]").forEach(function (im) { im.loading = "eager"; });
    });
  });

  // 2. the other pages, one after another — started by the visitor's first
  //    scroll, mouse move, touch or key press (so it never slows the first view)
  var started = false;
  function startPrefetch() {
    if (started) return; started = true;
    ["scroll", "mousemove", "touchstart", "keydown"].forEach(function (t) { window.removeEventListener(t, startPrefetch); });
    var i = 0;
    (function next() {
      if (i >= PAGES.length) return;
      prefetchPage(PAGES[i++]);
      whenIdle(next);
    })();
  }
  ["scroll", "mousemove", "touchstart", "keydown"].forEach(function (t) {
    window.addEventListener(t, startPrefetch, { passive: true });
  });

  // 3. a page the visitor points at (or touches) is loaded straight away
  document.addEventListener("pointerover", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='/']");
    if (a) prefetchPage(a.getAttribute("href"));
  }, { passive: true });
  document.addEventListener("touchstart", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='/']");
    if (a) prefetchPage(a.getAttribute("href"));
  }, { passive: true });
})();


/* ---- 10. Pictures fade in softly instead of popping in (only pictures
         that are not loaded yet; the profile photo and logos already shown
         are not touched). ---- */
(function () {
  function prepare(img) {
    if (img.complete && img.naturalWidth) return;          // already visible
    if (/^https?:/.test(img.getAttribute("src") || "")) return; // outside images (e.g. visitor map)
    img.classList.add("is-loading", "fade-in");
    function show() { img.classList.remove("is-loading"); }
    img.addEventListener("load", show, { once: true });
    img.addEventListener("error", show, { once: true });
  }
  function run() { document.querySelectorAll("main img").forEach(prepare); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

/* ---- 11. Arriving from a link such as Home -> SolarDT: glide down to the entry ---- */
(function () {
  if (!window.location.hash) return;
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm) return;
  alignToHash.glide = true;
  window.addEventListener("load", function () {
    setTimeout(function () { alignToHash(true); }, 150);   // glide the entry just below the menu bar
    setTimeout(function () { alignToHash(true); }, 1400);  // small correction if pictures moved things
  });
})();
