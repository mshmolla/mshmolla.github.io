/* Fetch and search this website's own published HTML pages. */
(function () {
  "use strict";
  var form = document.getElementById("site-search-form");
  if (!form || !window.SiteSearch) return;
  var core = window.SiteSearch;
  var input = document.getElementById("search-query");
  var clear = document.getElementById("search-clear");
  var filter = document.getElementById("search-page-filter");
  var results = document.getElementById("search-results");
  var status = document.getElementById("search-status");
  var note = document.getElementById("search-note");
  var empty = document.getElementById("search-empty");
  var emptyTitle = document.getElementById("search-empty-title");
  var emptyText = document.getElementById("search-empty-text");
  var more = document.getElementById("search-more");
  var retry = document.getElementById("search-retry");
  var warning = document.getElementById("search-warning");
  var suggestions = document.getElementById("search-suggestions");
  var allPages = document.getElementById("search-all-pages");
  var initial = new URLSearchParams(window.location.search);
  var index = null, busy = false, count = 12, timer = null, pages = [], requestedFilter = initial.get("page") || "";
  if (requestedFilter) requestedFilter = core.cleanPath(requestedFilter);
  input.value = (initial.get("q") || "").slice(0, 200);

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function highlighted(node, text, terms) {
    core.highlight(text, terms).forEach(function (part) {
      if (part.match) node.appendChild(element("mark", "", part.text));
      else node.appendChild(document.createTextNode(part.text));
    });
  }
  function address() {
    var url = new URL(window.location.href), q = input.value.trim();
    url.pathname = core.cleanPath(url.pathname);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    if (filter.value) url.searchParams.set("page", filter.value); else url.searchParams.delete("page");
    window.history.replaceState(null, "", url.pathname + url.search);
    document.title = (q ? "Search: " + q : "Search") + " | Md. Sabbir Hossain Molla";
  }
  function message(title, text) {
    empty.hidden = false; emptyTitle.textContent = title; emptyText.textContent = text;
  }
  function render() {
    var q = input.value.trim();
    clear.hidden = !q;
    results.replaceChildren(); suggestions.replaceChildren();
    empty.hidden = true; note.hidden = true; more.hidden = true;
    allPages.hidden = !filter.value;
    if (busy || !index) {
      status.textContent = busy ? "Loading this website’s pages…" : "Search could not load the website’s pages.";
      if (!busy) message("Search is temporarily unavailable", "Please retry, or browse the pages from the menu above.");
      return;
    }
    if (!q || core.normalize(q).length < 2) {
      status.textContent = "Search within " + pages.length + " website pages.";
      message("What are you looking for?", q ? "Type at least two characters to search." : "Search a project, paper, research topic, role, institution, or contact detail.");
      return;
    }
    var found = core.find(index, q, filter.value), total = found.results.length;
    status.textContent = total + (total === 1 ? " result" : " results") + " for “" + q + "”" + (filter.value ? " in " + filter.options[filter.selectedIndex].textContent : "");
    if (found.mode === "fuzzy" || found.mode === "related") {
      note.hidden = false;
      note.textContent = found.mode === "fuzzy" ? "Includes close spellings of your search words." : "No result matches every word. Showing the closest related entries.";
    }
    if (!total) {
      message("No matching content", "Try fewer words, a different spelling, or an exact phrase in double quotation marks.");
      found.suggestions.slice(0, 4).forEach(function (term) {
        var button = element("button", "search-chip", "Try “" + term + "”");
        button.type = "button";
        button.addEventListener("click", function () { input.value = term; run(true, true); input.focus(); });
        suggestions.appendChild(button);
      });
      return;
    }
    found.results.slice(0, count).forEach(function (match) {
      var record = match.record, target = new URL(record.url);
      if (target.origin !== window.location.origin) return;
      if (target.hash) target.searchParams.set("search", q);
      var item = element("li", "search-result");
      var article = element("article");
      var crumb = element("p", "search-result-location", record.page + (record.context ? " / " + record.context : ""));
      var heading = element("h2", "search-result-title");
      var link = element("a");
      link.href = target.pathname + target.search + target.hash;
      highlighted(link, record.title, match.terms);
      heading.appendChild(link);
      var excerpt = element("p", "search-result-excerpt");
      highlighted(excerpt, core.snippet(record.text, match.terms, 235), match.terms);
      article.append(crumb, heading, excerpt); item.appendChild(article); results.appendChild(item);
    });
    more.hidden = total <= count;
    if (!more.hidden) more.textContent = "Show more results (" + Math.min(count, total) + " of " + total + ")";
  }
  function run(resetCount, updateAddress) {
    if (timer) window.clearTimeout(timer);
    if (resetCount) count = 12;
    if (updateAddress) address();
    render();
  }
  function pageKey(url) {
    return core.cleanPath(url.pathname);
  }
  function pageLink(href, label, base) {
    try {
      var url = new URL(href, base);
      if (!/^https?:$/.test(url.protocol) || url.origin !== window.location.origin) return null;
      if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html$/i.test(url.pathname)) return null;
      if (/\/(?:search)(?:\.html)?\/?$/i.test(url.pathname)) return null;
      url.search = ""; url.hash = "";
      url.pathname = core.cleanPath(url.pathname);
      return { url: url.href, key: pageKey(url), label: label.trim() || "Page" };
    } catch (_) { return null; }
  }
  async function fetchPage(page) {
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
    try {
      var response = await window.fetch(page.url, { signal: controller.signal, cache: "no-cache", mode: "same-origin", credentials: "same-origin", headers: { "Accept": "text/html" } });
      if (!response.ok) throw new Error("HTTP " + response.status);
      if (new URL(response.url || page.url).origin !== window.location.origin) throw new Error("Outside this website");
      var type = response.headers.get("content-type") || "";
      if (type && !type.includes("text/html")) throw new Error("Not an HTML page");
      var doc = new DOMParser().parseFromString(await response.text(), "text/html");
      if (!doc.querySelector("main")) throw new Error("Missing page content");
      return { page: page, doc: doc, records: core.extract(doc, page.url, page.label) };
    } catch (_) { return { page: page, failed: true }; }
    finally { window.clearTimeout(timeout); }
  }
  async function load() {
    if (busy) return;
    busy = true; retry.hidden = true; warning.hidden = true; form.setAttribute("aria-busy", "true"); render();
    var known = new Set(), queue = [], records = [], available = [], failed = [];
    function add(href, label, base) {
      var page = pageLink(href, label, base);
      if (!page || known.has(page.key) || known.size >= 30) return;
      known.add(page.key); queue.push(page);
    }
    // Contact is injected by main.js on existing pages, so include it even
    // when a fetched page's unexecuted HTML still has the original menu.
    [ ["/", "Home"], ["/projects", "Projects"], ["/publications", "Publications"], ["/experience", "Experience"], ["/education", "Education"], ["/contact", "Contact"] ].forEach(function (p) { add(p[0], p[1], window.location.href); });
    document.querySelectorAll(".nav-links a").forEach(function (a) { add(a.getAttribute("href"), a.textContent, window.location.href); });
    while (queue.length) {
      var batch = queue.splice(0, 8);
      var fetched = await Promise.all(batch.map(fetchPage));
      fetched.forEach(function (result) {
        if (result.failed) { failed.push(result.page.label); return; }
        available.push(result.page); records.push.apply(records, result.records);
        result.doc.querySelectorAll(".nav-links a").forEach(function (a) { add(a.getAttribute("href"), a.textContent, result.page.url); });
      });
    }
    pages = available;
    index = records.length ? core.build(records) : null;
    var previous = filter.value || requestedFilter;
    filter.replaceChildren(element("option", "", "All pages"));
    filter.firstElementChild.value = "";
    available.forEach(function (page) {
      var option = element("option", "", page.label); option.value = new URL(page.url).pathname; filter.appendChild(option);
    });
    if (Array.from(filter.options).some(function (option) { return option.value === previous; })) filter.value = previous;
    requestedFilter = "";
    filter.disabled = !available.length;
    if (failed.length) {
      warning.hidden = false;
      warning.textContent = "Some pages could not be loaded: " + failed.join(", ") + ". Results cover the available pages.";
      retry.hidden = false;
    }
    busy = false; form.setAttribute("aria-busy", "false");
    if (index) address();
    render();
  }
  form.addEventListener("submit", function (event) { event.preventDefault(); run(true, true); });
  input.addEventListener("input", function (event) {
    clear.hidden = !input.value.trim();
    if (event.isComposing) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(function () { run(true, true); }, 140);
  });
  input.addEventListener("compositionend", function () { run(true, true); });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && input.value) { event.preventDefault(); input.value = ""; run(true, true); }
  });
  clear.addEventListener("click", function () { input.value = ""; run(true, true); input.focus(); });
  filter.addEventListener("change", function () { run(true, true); });
  allPages.addEventListener("click", function () { filter.value = ""; run(true, true); });
  more.addEventListener("click", function () { count += 12; render(); });
  retry.addEventListener("click", load);
  document.querySelectorAll("[data-search-example]").forEach(function (button) {
    button.addEventListener("click", function () { input.value = button.getAttribute("data-search-example"); filter.value = ""; run(true, true); input.focus(); });
  });
  window.addEventListener("popstate", function () {
    var params = new URLSearchParams(window.location.search);
    input.value = (params.get("q") || "").slice(0, 200);
    filter.value = params.get("page") ? core.cleanPath(params.get("page")) : "";
    run(true, false);
  });
  load();
})();
