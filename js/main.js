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
   ========================================================================== */

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
