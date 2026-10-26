/* ==========================================================================
   publications.js  —  Makes the paper buttons work (Publications page only).
   You normally never need to edit this file.
   1. "Abstract" and "Cite" buttons open/close their box.
   2. "IEEE" / "BibTeX" tabs switch the citation style.
   3. "Copy" copies the citation that is showing.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function () {

  /* 1. Open / close boxes */
  document.querySelectorAll(".pub-btn[aria-controls]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var box = document.getElementById(btn.getAttribute("aria-controls"));
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", !isOpen);
      box.hidden = isOpen;
    });
  });

  /* 2. IEEE / BibTeX tabs */
  document.querySelectorAll(".cite-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var box = tab.closest(".pub-panel");
      box.querySelectorAll(".cite-tab").forEach(function (t) { t.classList.toggle("active", t === tab); });
      box.querySelectorAll(".cite-text").forEach(function (c) { c.hidden = (c.id !== tab.dataset.show); });
    });
  });

  /* 3. Copy button */
  document.querySelectorAll(".cite-copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var shown = Array.prototype.find.call(
        btn.closest(".pub-panel").querySelectorAll(".cite-text"),
        function (c) { return !c.hidden; });
      if (!shown) return;
      var text = shown.innerText.trim();
      function done() {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        btn.classList.add("done");
        setTimeout(function () {
          btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
          btn.classList.remove("done");
        }, 1800);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done);
      } else {                                   // fallback for older browsers
        var t = document.createElement("textarea");
        t.value = text; document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        t.remove();
      }
    });
  });
});
