/* ==========================================================================
   publications.js  —  Makes the paper buttons work (Publications page only).
   You normally never need to edit this file.
   1. "Abstract", "Cite", "DOI" ... buttons open/close their box
      (only one box open at a time in each entry).
   2. "IEEE" / "BibTeX" tabs switch the citation style.
   3. "Copy" copies the citation that is showing.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function () {

  /* 1. Open / close boxes */
  document.querySelectorAll(".pub-btn[aria-controls]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var box = document.getElementById(btn.getAttribute("aria-controls"));
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      // Only one box open per entry: close the others in the same card first
      var card = btn.closest(".card");
      if (card && !isOpen) {
        card.querySelectorAll(".pub-btn[aria-controls]").forEach(function (other) {
          if (other === btn) return;
          other.setAttribute("aria-expanded", "false");
          var otherBox = document.getElementById(other.getAttribute("aria-controls"));
          if (otherBox) otherBox.hidden = true;
        });
      }
      btn.setAttribute("aria-expanded", !isOpen);
      box.hidden = isOpen;
    });
  });

  /* 2. IEEE / BibTeX tabs */
  document.querySelectorAll(".cite-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var box = tab.closest(".pub-panel");
      box.querySelectorAll(".cite-tab").forEach(function (t) {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-pressed", t === tab ? "true" : "false");   // tells screen readers which style is chosen
      });
      box.querySelectorAll(".cite-text").forEach(function (c) { c.hidden = (c.id !== tab.dataset.show); });
    });
  });

  // Screen readers: say which citation style is currently chosen
  document.querySelectorAll(".cite-tab").forEach(function (t) {
    t.setAttribute("aria-pressed", t.classList.contains("active") ? "true" : "false");
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
        btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied';
        btn.classList.add("done");
        setTimeout(function () {
          btn.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i> Copy';
          btn.classList.remove("done");
        }, 1800);
      }
      function oldWay() {                        // older browsers, or clipboard permission refused
        var t = document.createElement("textarea");
        t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select();
        try { if (document.execCommand("copy")) done(); } catch (e) {}
        t.remove();
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, oldWay);
      } else oldWay();
    });
  });
});
