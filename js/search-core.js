/* Site-only full-text search. No external search service or dependencies.
   Shared by the results page and by links that open a matching entry. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SiteSearch = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var STOP = new Set("a an and are as at be been by for from in into is it of on or that the their this to using was were with who what where when why how does do can could would should please find show me my our his her your about".split(" "));
  var ALIASES = [
    ["ai", "artificial intelligence"], ["ml", "machine learning"],
    ["dl", "deep learning"], ["pv", "photovoltaic"],
    ["xai", "explainable ai"], ["etd", "electricity theft detection"],
    ["ntl", "non technical loss"], ["sg", "smart grid"],
    ["paper", "papers", "publication", "publications"],
    ["phone", "telephone", "phone number", "mobile", "mobile number"],
    ["email", "e mail", "email address"]
  ];
  var UNIT = "article, .award-card, section:not(.page-header), .contact-details";

  function normalize(value) {
    return String(value || "").normalize("NFKD").replace(/\p{M}/gu, "")
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  }
  function words(value) { var n = normalize(value); return n ? n.split(" ") : []; }
  function containsPhrase(text, phrase) { return (" " + text + " ").includes(" " + phrase + " "); }
  function expand(value) {
    var n = normalize(value), additions = [];
    ALIASES.forEach(function (group) {
      if (group.some(function (alias) { return containsPhrase(n, alias); })) additions.push(group.join(" "));
    });
    return n + " " + additions.join(" ");
  }
  function slug(value) { return normalize(value).replace(/ /g, "-").slice(0, 90) || "entry"; }
  function textOf(node) {
    if (!node) return "";
    var clone = node.cloneNode(true);
    clone.querySelectorAll("script, style, noscript, form, button, input, textarea, select, iframe, .img-missing, a.btn, summary").forEach(function (n) { n.remove(); });
    clone.querySelectorAll("a[aria-label]").forEach(function (link) {
      if (!link.textContent.trim()) link.appendChild(clone.ownerDocument.createTextNode(link.getAttribute("aria-label")));
    });
    // DOM textContent does not put spaces between adjacent block elements.
    clone.querySelectorAll("p, div, li, h1, h2, h3, h4, span, br, details").forEach(function (n) { n.appendChild(clone.ownerDocument.createTextNode(" ")); });
    return clone.textContent.replace(/\s+/g, " ").trim();
  }
  function titleOf(node) {
    var heading = node.querySelector("h1, h2, h3, h4, .award-name");
    var title = heading ? textOf(heading) : "";
    var role = node.querySelector(".entry-role");
    return role && title ? textOf(role) + " — " + title : title;
  }
  function units(doc) {
    var main = doc.querySelector("main");
    if (!main) return [];
    return Array.from(main.querySelectorAll(UNIT)).filter(function (node) {
      return !node.querySelector(UNIT) && Boolean(titleOf(node));
    });
  }
  function assignAnchors(doc) {
    return units(doc).map(function (node) {
      if (!node.id) {
        var base = "site-search-" + slug(titleOf(node)), id = base, suffix = 2;
        while (doc.getElementById(id)) id = base + "-" + suffix++;
        node.id = id;
      }
      return node;
    });
  }
  function extract(doc, pageUrl, label) {
    var url = new URL(pageUrl);
    if (!/^https?:$/.test(url.protocol)) return [];
    url.hash = ""; url.search = "";
    var pageTitle = label || (doc.querySelector("title") ? doc.querySelector("title").textContent.split("|")[0].trim() : "Page");
    var main = doc.querySelector("main");
    if (!main) return [];
    var description = doc.querySelector('meta[name="description"]');
    var records = [{
      title: pageTitle, context: "", page: pageTitle, pageUrl: url.href,
      url: url.href, text: description ? description.getAttribute("content") : pageTitle,
      priority: .72, kind: "page"
    }];
    var entries = assignAnchors(doc);
    if (!entries.length) records[0].text = textOf(main) || records[0].text;
    entries.forEach(function (node) {
      var title = titleOf(node), section = node.closest("section");
      var sectionHeading = section && section.querySelector("h2.section-title");
      var context = sectionHeading ? textOf(sectionHeading) : "";
      if (context === title) context = "";
      var displayTitle = context && !/^(publications|thesis|featured projects|awards and honors)$/i.test(context)
        && !normalize(title).startsWith(normalize(context)) ? context + " — " + title : title;
      var body = textOf(node);
      if (body.startsWith(title)) body = body.slice(title.length).trim();
      var target = new URL(url.href); target.hash = node.id;
      records.push({
        title: displayTitle, context: context, page: pageTitle, pageUrl: url.href,
        url: target.href, text: body || title,
        priority: node.classList.contains("project-card") ? .62 : 1,
        kind: "entry"
      });
    });
    return records;
  }
  function frequencies(value) {
    var map = new Map();
    words(expand(value)).forEach(function (word) { map.set(word, (map.get(word) || 0) + 1); });
    return map;
  }
  function build(records) {
    var frequency = new Map(), vocabulary = new Set(), totalLength = 0;
    var entries = records.map(function (record, order) {
      var fields = [record.title, record.context, record.page, record.text].map(frequencies);
      var unique = new Set();
      fields.forEach(function (field) { field.forEach(function (_, word) { unique.add(word); vocabulary.add(word); }); });
      unique.forEach(function (word) { frequency.set(word, (frequency.get(word) || 0) + 1); });
      var length = words(record.text).length + words(record.title).length;
      totalLength += length;
      return { record: record, fields: fields, length: length, order: order, normal: normalize(record.title + " " + record.context + " " + record.text) };
    });
    return { entries: entries, vocabulary: Array.from(vocabulary), frequency: frequency, average: totalLength / Math.max(1, entries.length) };
  }
  // Optimal-string-alignment distance also handles adjacent transpositions.
  function distance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    var previous = Array.from({ length: b.length + 1 }, function (_, j) { return j; });
    var before = null;
    for (var i = 1; i <= a.length; i++) {
      var row = [i];
      for (var j = 1; j <= b.length; j++) {
        row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (before && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], before[j - 2] + 1);
      }
      before = previous; previous = row;
    }
    return previous[b.length];
  }
  function candidates(index, term, last) {
    var choices = [], exact = index.frequency.has(term);
    if (exact) choices.push({ word: term, quality: 1, fuzzy: false });
    if (last && term.length >= 2) {
      index.vocabulary.forEach(function (word) {
        if (word !== term && word.startsWith(term)) choices.push({ word: word, quality: .78 + .12 * term.length / word.length, fuzzy: false });
      });
    }
    if (!choices.length && term.length >= 4 && /\p{L}/u.test(term)) {
      var limit = term.length >= 9 ? 2 : 1;
      index.vocabulary.forEach(function (word) {
        if (word.length < 4) return;
        var d = distance(term, word, limit);
        if (d <= limit) choices.push({ word: word, quality: .64 - d * .1, fuzzy: true });
      });
    }
    return choices.sort(function (a, b) { return b.quality - a.quality || a.word.localeCompare(b.word); }).slice(0, 36);
  }
  function parse(query) {
    var raw = String(query || "").trim().slice(0, 200);
    var phrases = [], match, regex = /"([^"]+)"/g;
    while ((match = regex.exec(raw))) { var phrase = normalize(match[1]); if (phrase) phrases.push(phrase); }
    var all = Array.from(new Set(words(raw))), terms = all.filter(function (word) { return !STOP.has(word); });
    return { raw: raw, terms: (terms.length ? terms : all).slice(0, 24), phrases: phrases };
  }
  function find(index, query, page) {
    var parsed = parse(query), terms = parsed.terms;
    if (!terms.length) return { results: [], terms: [], mode: "empty", suggestions: [] };
    var options = terms.map(function (term, i) { return candidates(index, term, i === terms.length - 1); });
    var n = Math.max(1, index.entries.length), weights = [6, 2.5, .8, 1];
    var scored = [];
    index.entries.forEach(function (entry) {
      if (page && new URL(entry.record.pageUrl).pathname !== page) return;
      if (!parsed.phrases.every(function (phrase) { return containsPhrase(entry.normal, phrase); })) return;
      var score = 0, matched = 0, fuzzy = false, marked = new Set(terms);
      options.forEach(function (choices) {
        var best = null;
        choices.forEach(function (choice) {
          var tf = 0;
          entry.fields.forEach(function (field, i) { tf += (field.get(choice.word) || 0) * weights[i]; });
          if (!tf) return;
          var df = index.frequency.get(choice.word) || 1;
          var idf = Math.log(1 + (n - df + .5) / (df + .5));
          var value = idf * (tf * 2.2 / (tf + 1.2 * (.25 + .75 * entry.length / Math.max(1, index.average)))) * choice.quality;
          if (entry.fields[0].has(choice.word)) value += idf * 1.3 * choice.quality;
          if (!best || value > best.value) best = { value: value, choice: choice };
        });
        if (best) { matched++; score += best.value; fuzzy = fuzzy || best.choice.fuzzy; marked.add(best.choice.word); }
      });
      if (!matched) return;
      var phrase = normalize(parsed.raw);
      if (phrase && containsPhrase(entry.normal, phrase)) score += 3;
      ALIASES.forEach(function (group) {
        if (group.some(function (alias) { return containsPhrase(normalize(parsed.raw), alias); })) group.forEach(function (alias) { words(alias).forEach(function (word) { marked.add(word); }); });
      });
      scored.push({ record: entry.record, score: score * (entry.record.priority || 1), matched: matched, fuzzy: fuzzy, terms: Array.from(marked), order: entry.order });
    });
    var complete = scored.filter(function (result) { return result.matched === terms.length; });
    var results = complete, mode = "exact";
    if (!results.length && terms.length >= 3 && !parsed.phrases.length) {
      results = scored.filter(function (result) { return result.matched >= Math.max(2, Math.ceil(terms.length * .75)); });
      mode = "related";
    }
    results.sort(function (a, b) { return b.matched - a.matched || b.score - a.score || a.order - b.order; });
    if (mode !== "related" && results.some(function (r) { return r.fuzzy; })) mode = "fuzzy";
    var suggestions = [];
    if (!results.length) options.forEach(function (choices, i) {
      if (choices.length && !index.frequency.has(terms[i])) suggestions.push(choices[0].word);
    });
    return { results: results, terms: terms, mode: mode, suggestions: Array.from(new Set(suggestions)) };
  }
  function mappedText(value) {
    var text = String(value), normalized = "", starts = [], ends = [], offset = 0;
    for (var original of text) {
      var part = original.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
      for (var c of part) {
        var next = /[\p{L}\p{N}]/u.test(c) ? c : " ";
        if (next === " " && normalized.endsWith(" ")) continue;
        normalized += next;
        for (var k = 0; k < next.length; k++) { starts.push(offset); ends.push(offset + original.length); }
      }
      offset += original.length;
    }
    return { text: text, normalized: normalized, starts: starts, ends: ends };
  }
  function ranges(value, terms) {
    var map = mappedText(value), found = [];
    Array.from(new Set(terms)).filter(Boolean).forEach(function (term) {
      term = normalize(term);
      if (!term) return;
      var from = 0, at;
      while ((at = map.normalized.indexOf(term, from)) !== -1) {
        var end = at + term.length;
        var left = at === 0 || map.normalized[at - 1] === " ";
        var right = end === map.normalized.length || map.normalized[end] === " ";
        if (left && right) found.push({ start: map.starts[at], end: map.ends[end - 1], term: term });
        from = end;
      }
    });
    return found.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
  }
  function highlight(value, terms) {
    var text = String(value), found = ranges(text, terms), merged = [];
    found.forEach(function (range) {
      var last = merged[merged.length - 1];
      if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
      else merged.push({ start: range.start, end: range.end });
    });
    var result = [], at = 0;
    merged.forEach(function (range) {
      if (range.start > at) result.push({ text: text.slice(at, range.start), match: false });
      result.push({ text: text.slice(range.start, range.end), match: true }); at = range.end;
    });
    if (at < text.length) result.push({ text: text.slice(at), match: false });
    return result;
  }
  function snippet(value, terms, length) {
    var text = String(value).replace(/\s+/g, " ").trim(), size = length || 230;
    if (text.length <= size) return text;
    var found = ranges(text, terms), start = 0, best = -1;
    found.slice(0, 100).forEach(function (range) {
      var candidate = Math.max(0, Math.min(text.length - size, range.start - Math.floor(size * .3)));
      var visible = found.filter(function (r) { return r.start >= candidate && r.end <= candidate + size; });
      var score = new Set(visible.map(function (r) { return r.term; })).size * 5 + visible.length;
      if (score > best) { best = score; start = candidate; }
    });
    if (start > 0 && text[start - 1] !== " ") { var next = text.indexOf(" ", start); if (next !== -1 && next - start < 25) start = next + 1; }
    var end = Math.min(text.length, start + size);
    if (end < text.length && text[end] !== " ") { var space = text.lastIndexOf(" ", end); if (space > start) end = space; }
    return (start ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
  }
  return { normalize: normalize, slug: slug, assignAnchors: assignAnchors, extract: extract, build: build, find: find, highlight: highlight, snippet: snippet, distance: distance };
});
