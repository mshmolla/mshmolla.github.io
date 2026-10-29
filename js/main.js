/* ==========================================================================
   main.js  —  The small amount of JavaScript the site needs.
   You normally never need to edit this file.

   What it does:
   1. Opens/closes the menu on phones when you tap the ☰ button.
   2. Highlights the current page in the menu.
   3. If an image file is missing, shows a grey box with the expected
      file name (so you know what to upload).
   4. When a link jumps to an entry (e.g. /projects#securegrid), places
      that entry's title just below the menu bar, even after pictures
      and videos above it finish loading.
   5. "Filter by Topic" menu on the Publications page.
   6. Website search (header icon).
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
  window.__navHoldUntil = Date.now() + 1800;   // keep the menu bar visible while jumping
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

  /* Search box that opens over the page (no separate page needed) */
  var box = null, index = null, loading = null, timer = null;
  var PAGES = [["/", "Home"], ["/projects", "Projects"], ["/publications", "Publications"],
               ["/experience", "Experience"], ["/education", "Education"], ["/contact", "Contact"]];
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function marked(node, text, terms) {
    window.SiteSearch.highlight(text, terms).forEach(function (p) {
      node.appendChild(p.match ? el("mark", "", p.text) : document.createTextNode(p.text));
    });
  }
  function buildIndex() {
    if (loading) return loading;
    loading = new Promise(function (resolve) { loadSearchCore(resolve); }).then(function () {
      return Promise.all(PAGES.map(function (p) {
        var url = new URL(p[0], siteBase).href;
        return fetch(url, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.text() : ""; })
          .then(function (html) {
            if (!html) return [];
            var doc = new DOMParser().parseFromString(html, "text/html");
            return window.SiteSearch.extract(doc, url, p[1]);
          }).catch(function () { return []; });
      }));
    }).then(function (lists) {
      var records = [].concat.apply([], lists);
      index = records.length ? window.SiteSearch.build(records) : null;
      return index;
    });
    return loading;
  }
  function render() {
    var q = box.input.value.trim();
    box.clear.hidden = !q;
    box.list.replaceChildren();
    if (!q || window.SiteSearch && window.SiteSearch.normalize(q).length < 2) { box.status.textContent = ""; return; }
    if (!index) { box.status.textContent = "Searching…"; return; }
    var found = window.SiteSearch.find(index, q, ""), total = found.results.length;
    box.status.textContent = total ? total + (total === 1 ? " matching result" : " matching results") : "No results for \u201c" + q + "\u201d. Try another word.";
    found.results.slice(0, 30).forEach(function (match) {
      var r = match.record, target = new URL(r.url);
      if (target.hash) target.searchParams.set("search", q);
      var li = el("li", "ss-item"), a = el("a", "ss-link");
      a.href = target.pathname + target.search + target.hash;
      var page = el("span", "ss-page", r.page);
      var title = el("span", "ss-title"); marked(title, r.title, match.terms);
      var text = el("span", "ss-text"); marked(text, window.SiteSearch.snippet(r.text, match.terms, 170), match.terms);
      a.append(page, title, text); li.appendChild(a); box.list.appendChild(li);
    });
  }
  function closeSearch() {
    if (!box || box.root.hidden) return;
    box.root.hidden = true; document.documentElement.classList.remove("ss-open");
    if (box.returnTo) box.returnTo.focus();
  }
  // The search box brings its own styles, so it always looks right
  // even if a page was saved with older styles.
  var SS_CSS = 'html.ss-open { overflow: hidden; } .ss-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(14, 21, 32, .45); display: flex; justify-content: center; align-items: flex-start; padding: 72px 16px 16px; } .ss-overlay[hidden] { display: none; } .ss-panel { width: 100%; max-width: 760px; max-height: calc(100vh - 110px); display: flex; flex-direction: column; background: var(--color-surface); border-radius: var(--radius); box-shadow: 0 18px 50px rgba(0, 0, 0, .3); overflow: hidden; } .ss-bar { display: flex; align-items: center; gap: 12px; padding: 6px 10px; border-bottom: 1px solid var(--color-border); } .ss-field { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; padding: 0 10px; border: 1.5px solid var(--color-accent); border-radius: 8px; background: var(--color-surface); color: var(--color-muted); } .ss-input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; padding: 4px 0; font: inherit; font-size: .95rem; line-height: 1.4; height: 32px; box-sizing: border-box; color: var(--color-text); } .ss-input::-webkit-search-cancel-button { display: none; } .ss-clear { border: 0; background: none; font-size: 1.5rem; line-height: 1; color: var(--color-muted); cursor: pointer; padding: 0 2px; } .ss-cancel { border: 0; background: none; font: inherit; font-weight: 600; color: var(--color-primary); cursor: pointer; padding: 4px; } .ss-status:empty { display: none; } .ss-status { margin: 0; padding: 10px 18px; font-size: .9rem; color: var(--color-muted); background: var(--color-bg); } .ss-results { list-style: none; margin: 0; padding: 0; overflow-y: auto; } .ss-item + .ss-item { border-top: 1px solid var(--color-border); } .ss-link { display: block; padding: 14px 18px; color: var(--color-text); text-decoration: none; } .ss-link:hover, .ss-link:focus-visible { background: var(--color-tint); text-decoration: none; outline: none; } .ss-page { display: block; font-size: .78rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--color-accent); } .ss-title { display: block; margin: 2px 0 4px; font-weight: 700; color: var(--color-primary); } .ss-text { display: block; font-size: .9rem; line-height: 1.5; color: var(--color-muted); } .ss-results mark { background: rgba(255, 214, 10, .45); color: inherit; border-radius: 2px; padding: 0 1px; } @media (max-width: 600px) { .ss-overlay { padding: 12px 8px; } .ss-panel { max-height: calc(100vh - 24px); } }';
  function openSearch() {
    if (!document.getElementById("ss-style")) {
      var st = document.createElement("style"); st.id = "ss-style"; st.textContent = SS_CSS;
      document.head.appendChild(st);
    }
    if (!box) {
      var root = el("div", "ss-overlay"); root.hidden = true;
      root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Search this website");
      var panel = el("div", "ss-panel");
      var bar = el("div", "ss-bar");
      var field = el("label", "ss-field");
      field.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path></svg>';
      var input = el("input", "ss-input"); input.type = "search"; input.placeholder = "Search this website…";
      input.setAttribute("aria-label", "Search this website"); input.autocomplete = "off";
      var clear = el("button", "ss-clear", "\u00d7"); clear.type = "button"; clear.hidden = true; clear.setAttribute("aria-label", "Clear search");
      field.append(input, clear);
      var cancel = el("button", "ss-cancel", "Cancel"); cancel.type = "button";
      bar.append(field, cancel);
      var status = el("p", "ss-status"); status.setAttribute("aria-live", "polite");
      var list = el("ul", "ss-results");
      panel.append(bar, status, list); root.appendChild(panel); document.body.appendChild(root);
      box = { root: root, input: input, clear: clear, status: status, list: list };
      input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(render, 120); });
      clear.addEventListener("click", function () { input.value = ""; render(); input.focus(); });
      cancel.addEventListener("click", closeSearch);
      root.addEventListener("click", function (e) { if (e.target === root) closeSearch(); });
      root.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); closeSearch(); return; }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          var links = Array.from(list.querySelectorAll("a")); if (!links.length) return;
          var i = links.indexOf(document.activeElement);
          i = e.key === "ArrowDown" ? (i + 1) % links.length : (i <= 0 ? links.length - 1 : i - 1);
          e.preventDefault(); links[i].focus();
        }
        if (e.key === "Tab") {   // keep keyboard focus inside the search box
          var f = [input, clear, cancel].concat(Array.from(list.querySelectorAll("a"))).filter(function (n) { return !n.hidden; });
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    box.returnTo = document.activeElement;
    box.root.hidden = false; document.documentElement.classList.add("ss-open");
    box.input.focus(); box.input.select();
    render();
    buildIndex().then(render);
  }
  function setupSearch() {
    var header = document.querySelector(".site-header");
    var container = header && header.querySelector(".container");
    if (!container) return;
    // (search styles are part of css/style.css)
    header.classList.add("has-site-search");
    var link = document.getElementById("site-search-trigger");
    if (!link) {
      link = document.createElement("a");
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
    // Open the search box: click the magnifier, or press "/" anywhere
    link.addEventListener("click", function (event) {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) return;
      event.preventDefault(); openSearch();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (event.target.closest && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault(); openSearch();
    });
    revealSearchTarget();
    window.addEventListener("hashchange", revealSearchTarget);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupSearch);
  else setupSearch();
})();

/* ---- 7. News box (Home page): show 5½ items (4½ on phones), scroll for the rest ---- */
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
    // Measure in the next animation frame, when the browser lays out the
    // page anyway (avoids an extra "forced" layout that slows phones).
    var queued = false;
    function later() {
      if (queued) return; queued = true;
      requestAnimationFrame(function () { queued = false; size(); });
    }
    box.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", later);
    window.addEventListener("load", later);            // re-measure after fonts load
    later();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();


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
  });

  // 2. the other pages, one after another — started by the visitor's first
  //    scroll, mouse move, touch or key press (so it never slows the first view)
  var started = false;
  function startPrefetch(e) {
    // ignore the automatic "mouse move" some browsers/test tools send at page load
    if (e && e.type === "mousemove" && !e.movementX && !e.movementY) return;
    if (started) return; started = true;
    // 1. finish loading this page's remaining pictures
    document.querySelectorAll("img[loading=lazy]").forEach(function (im) { im.loading = "eager"; });
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
    if (img.classList.contains("hero-photo")) return;       // profile photo: show at once
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

/* ---- 13. Menu bar hides while scrolling down and comes back when
         scrolling up (always shown near the top of the page) ---- */
(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  header.style.transition = calm ? "none" : "transform .3s ease";
  header.style.willChange = "transform";
  var lastY = window.pageYOffset, hidden = false, ticking = false;
  function show(yes) {
    if (yes === !hidden) return;
    hidden = !yes;
    header.style.transform = yes ? "" : "translateY(-100%)";
  }
  function update() {
    ticking = false;
    var y = Math.max(0, window.pageYOffset), dy = y - lastY;
    var menuOpen = document.querySelector(".nav-links.open");
    var searchOpen = document.documentElement.classList.contains("ss-open");
    var holding = Date.now() < (window.__navHoldUntil || 0);
    if (y < header.offsetHeight + 10 || menuOpen || searchOpen || holding) show(true);
    else if (dy > 6) show(false);        // scrolling down
    else if (dy < -6) show(true);        // scrolling up
    if (Math.abs(dy) > 6 || y < 10) lastY = y;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  // Keyboard users: show the bar whenever something in it gets focus
  header.addEventListener("focusin", function () { show(true); });
})();
