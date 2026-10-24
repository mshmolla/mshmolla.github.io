/* ==========================================================================
   main.js  —  The small amount of JavaScript the site needs.
   You normally never need to edit this file.

   It does 3 things:
   1. Opens/closes the menu on phones when you tap the ☰ button.
   2. Highlights the current page in the menu.
   3. If an image file is missing, shows a grey box with the expected
      file name (so you know what to upload).
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
