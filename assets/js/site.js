/* Veer New Look Central School, Halol: site behaviour.
   Vanilla JS, no framework. Everything here is progressive enhancement. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");
  var STORE_KEY = "vnl-theme";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------- Theme toggle ---------- */
  function currentTheme() { return root.getAttribute("data-theme") === "whiteboard" ? "whiteboard" : "blackboard"; }

  function applyTheme(theme, save) {
    root.setAttribute("data-theme", theme);
    if (save) { try { localStorage.setItem(STORE_KEY, theme); } catch (e) { /* private mode: ignore */ } }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "whiteboard" ? "#FAFAF7" : "#1E2B25");
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-pressed", theme === "whiteboard" ? "true" : "false");
      btn.querySelectorAll("[data-theme-name]").forEach(function (s) {
        s.classList.toggle("is-on", s.getAttribute("data-theme-name") === theme);
      });
      var status = btn.querySelector(".theme-toggle__status");
      if (status) status.textContent = theme === "whiteboard" ? "(Whiteboard on)" : "(Blackboard on)";
    });
    recolourAnnotations();
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".theme-toggle");
    if (!btn) return;
    applyTheme(currentTheme() === "whiteboard" ? "blackboard" : "whiteboard", true);
  });

  /* ---------- Chalk outlines: hand-drawn boxes, pills and phones ---------- */
  function rng(seed) { // mulberry32: same seed, same wobble on every visit
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Points around a rounded rectangle, with jitter, as one open loop that overshoots its start.
  function wobblyLoop(w, h, r, rand, amp) {
    r = Math.min(r, h / 2, w / 2);
    var pts = [], i, steps;
    function j() { return (rand() - .5) * 2 * amp; }
    function edge(x1, y1, x2, y2) {
      steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 60));
      for (i = 0; i < steps; i++) { var t = i / steps; pts.push([x1 + (x2 - x1) * t + j(), y1 + (y2 - y1) * t + j()]); }
    }
    function arc(cx, cy, a0) {
      for (i = 0; i < 4; i++) { var a = a0 + (Math.PI / 2) * (i / 4); pts.push([cx + Math.cos(a) * r + j() * .6, cy + Math.sin(a) * r + j() * .6]); }
    }
    edge(r, 0, w - r, 0); arc(w - r, r, -Math.PI / 2);
    edge(w, r, w, h - r); arc(w - r, h - r, 0);
    edge(w - r, h, r, h); arc(r, h - r, Math.PI / 2);
    edge(0, h - r, 0, r); arc(r, r, Math.PI);
    pts.push([pts[0][0] + 10 + j(), pts[0][1] + j()]); // chalk overshoot past the start
    return pts;
  }

  function toPath(pts, close) { // Catmull-Rom to cubic Bezier: smooth, hand-like curves
    var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += " C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
        " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
        " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
    }
    return d + (close ? " Z" : "");
  }

  var seedCounter = 1;
  function drawOutline(el) {
    var w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    var shape = el.getAttribute("data-chalk") || "box";
    var seed = parseInt(el.getAttribute("data-seed"), 10) || (el._seed || (el._seed = seedCounter++ * 7919));
    var rand = rng(seed);
    var radius = shape === "pill" ? h / 2 : shape === "phone" ? 30 : 16;
    var amp = shape === "pill" ? 1.4 : 2.2;
    var svg = el._outline;
    if (!svg) {
      svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("class", "chalk-outline");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      el.insertBefore(svg, el.firstChild);
      el._outline = svg;
    }
    svg.setAttribute("viewBox", "-6 -6 " + (w + 12) + " " + (h + 12));
    svg.style.inset = "-6px";
    svg.style.width = (w + 12) + "px";
    svg.style.height = (h + 12) + "px";
    var html = "";
    if (el.hasAttribute("data-chalk-fill")) {
      html += '<path class="fill" d="' + toPath(wobblyLoop(w, h, radius, rand, amp * .6).slice(0, -1), true) + '"/>';
    }
    html += '<path d="' + toPath(wobblyLoop(w, h, radius, rand, amp), false) + '"/>';
    // a second, lighter pass: chalk is rarely one clean stroke
    html += '<path d="' + toPath(wobblyLoop(w, h, radius, rand, amp * 1.3), false) + '" opacity=".45" stroke-width="1.2"/>';
    svg.innerHTML = html;
  }

  var ro = "ResizeObserver" in window ? new ResizeObserver(function (entries) { entries.forEach(function (en) { drawOutline(en.target); }); }) : null;
  function outlineAll() {
    document.querySelectorAll("[data-chalk]").forEach(function (el) {
      if (el._chalked) return;
      el._chalked = true;
      drawOutline(el);
      if (ro) ro.observe(el);
    });
  }
  outlineAll();
  // fonts change sizes; content can be injected later (reels, notices)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { document.querySelectorAll("[data-chalk]").forEach(drawOutline); });
  document.addEventListener("vnl:content", function () { outlineAll(); watchReels(); });

  /* ---------- Rough Notation: underline, circle, box, drawn in once on scroll ---------- */
  var annotations = [];
  function cssColour(value) {
    var m = /var\((--[\w-]+)\)/.exec(value || "");
    return m ? getComputedStyle(root).getPropertyValue(m[1]).trim() : value;
  }
  function recolourAnnotations() {
    annotations.forEach(function (a) { a.ann.color = cssColour(a.colour); });
  }

  function setUpAnnotations() {
    if (!window.RoughNotation) return;
    var els = document.querySelectorAll("[data-annotate]");
    if (!els.length) return;
    var show = function (el) {
      if (el._annotated) return;
      el._annotated = true;
      var colour = el.getAttribute("data-color") || "var(--accent-2)";
      var ann = window.RoughNotation.annotate(el, {
        type: el.getAttribute("data-annotate"),
        color: cssColour(colour),
        strokeWidth: parseFloat(el.getAttribute("data-stroke")) || 2.4,
        padding: parseFloat(el.getAttribute("data-padding")) || (el.getAttribute("data-annotate") === "underline" ? 1 : 5),
        iterations: 2,
        animate: !reduceMotion,
        animationDuration: 700,
        multiline: false
      });
      annotations.push({ ann: ann, colour: colour });
      var delay = reduceMotion ? 0 : parseInt(el.getAttribute("data-delay"), 10) || 0;
      setTimeout(function () { ann.show(); }, delay);
    };
    if (!("IntersectionObserver" in window)) { els.forEach(show); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }
  // fonts change text width; wait so circles fit the real words
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setUpAnnotations);
  else window.addEventListener("load", setUpAnnotations);

  /* ---------- Reels: play muted in view, stop when out, tap to unmute ---------- */
  var rio = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting && !reduceMotion && !v.closest("[data-paused]")) {
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else { v.pause(); }
    });
  }, { threshold: 0.6 }) : null;
  function watchReels() {
    document.querySelectorAll(".reel video").forEach(function (v) {
      if (v._watched) return;
      v._watched = true; v.muted = true;
      if (rio) rio.observe(v);
    });
  }
  watchReels();
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".reel__sound");
    if (!btn) return;
    var v = btn.closest(".reel").querySelector("video");
    if (!v) return;
    var unmute = v.muted;
    // only one reel speaks at a time
    document.querySelectorAll(".reel video").forEach(function (o) { o.muted = true; });
    document.querySelectorAll(".reel__sound").forEach(function (b) { setSoundButton(b, false); });
    v.muted = !unmute;
    if (unmute) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    setSoundButton(btn, unmute);
  });
  function setSoundButton(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Mute reel" : "Unmute reel");
    var use = btn.querySelector("use");
    if (use) use.setAttribute("href", btn.getAttribute("data-sprite") + (on ? "#i-sound-on" : "#i-sound-off"));
  }

  /* ---------- Pause buttons for marquees and the reels row ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-pause-target]");
    if (!btn) return;
    var target = document.getElementById(btn.getAttribute("data-pause-target"));
    if (!target) return;
    var paused = target.hasAttribute("data-paused");
    if (paused) target.removeAttribute("data-paused"); else target.setAttribute("data-paused", "");
    btn.setAttribute("aria-pressed", paused ? "false" : "true");
    var label = btn.querySelector(".pause-label");
    if (label) label.textContent = paused ? "Pause" : "Play";
    target.querySelectorAll("video").forEach(function (v) { if (!paused) v.pause(); });
    var icon = btn.querySelector("use");
    if (icon) icon.setAttribute("href", "/assets/doodles/sprite.svg" + (paused ? "#i-pause" : "#i-play"));
  });

  applyTheme(currentTheme(), false);
})();

/* ==========================================================================
   Motion and page furniture. CSS does the animating; JS only flips classes.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SPRITE = "/assets/doodles/sprite.svg";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function icon(id, cls) { return '<svg class="' + (cls || "") + '" aria-hidden="true" focusable="false"><use href="' + SPRITE + "#" + id + '"/></svg>'; }

  /* ---------- Staggered reveals ---------- */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    var kids = group.querySelectorAll(":scope > [data-reveal], :scope > * > [data-reveal]");
    kids.forEach(function (el, i) { el.style.setProperty("--i", i); });
  });
  document.querySelectorAll(".write-on > span").forEach(function (el, i) { el.style.setProperty("--i", i); });

  var revealables = document.querySelectorAll("[data-reveal], .doodle[data-draw], [data-count]");
  function reveal(el) {
    el.classList.add("is-in");
    if (el.hasAttribute("data-count")) countUp(el);
  }
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(reveal);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Count up (only for figures the school has confirmed) ---------- */
  function countUp(el) {
    var end = parseInt(el.getAttribute("data-count"), 10);
    var start = parseInt(el.getAttribute("data-count-from"), 10) || 0;
    if (isNaN(end) || reduceMotion) { return; }
    var t0 = null, dur = 1400;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (end - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { header.classList.toggle("is-scrolled", window.scrollY > 8); ticking = false; });
    }, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  var menu = document.getElementById("mobile-menu");
  var openBtn = document.querySelector("[data-menu-open]");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) menu.removeAttribute("inert"); else menu.setAttribute("inert", "");
    document.querySelectorAll("[data-menu-open], [data-menu-close]").forEach(function (b) { b.setAttribute("aria-expanded", open ? "true" : "false"); });
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { var first = menu.querySelector("a"); if (first) setTimeout(function () { first.focus(); }, 100); }
    else if (openBtn) openBtn.focus();
  }
  if (menu) {
    menu.querySelectorAll("li").forEach(function (li, i) { li.style.setProperty("--i", i); });
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-menu-open]")) setMenu(true);
      else if (e.target.closest("[data-menu-close]")) setMenu(false);
      else if (menu.classList.contains("is-open") && e.target.closest("#mobile-menu a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });
  }

  /* ---------- Notice ticker: latest three notices from /data/notices-latest.json ---------- */
  var ticker = document.querySelector("[data-ticker]");
  if (ticker) {
    fetch("/data/notices-latest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || data.tickerOn === false || !data.notices || !data.notices.length) { ticker.hidden = true; return; }
      var now = Date.now(), WEEK = 7 * 864e5;
      var items = data.notices.slice(0, 3).map(function (n) {
        var d = new Date(n.date), isNew = now - d.getTime() < WEEK && now >= d.getTime();
        var label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        return '<li>' + (isNew ? '<span class="tag tag--new">New</span>' : "") +
          '<time datetime="' + esc(n.date) + '">' + esc(label) + '</time>' +
          '<a href="' + esc(n.url) + '">' + esc(n.title) + "</a></li>";
      }).join("");
      var list = ticker.querySelector(".ticker__list");
      // doubled list so the loop on small screens is seamless; the copy is hidden from screen readers
      list.innerHTML = items + items.replace(/<li>/g, '<li aria-hidden="true">').replace(/<a /g, '<a tabindex="-1" ');
      ticker.hidden = false;
    }).catch(function () { ticker.hidden = true; });
  }

  /* ---------- Instagram reels: our JSON, or Behold's, with a graceful fallback ---------- */
  var reelsRow = document.querySelector("[data-reels]");
  var ACCOUNTS = [
    { handle: "vnlcs_halol", url: "https://www.instagram.com/vnlcs_halol/" },
    { handle: "veernewlookschoolhalol", url: "https://www.instagram.com/veernewlookschoolhalol/" }
  ];
  function followCard(acc) {
    return '<figure class="reel reel--follow"><div class="reel__phone" data-chalk="phone"><span class="reel__notch" aria-hidden="true"></span>' +
      '<div class="reel__screen">' + '<div>' + icon("i-instagram") + '<strong>@' + esc(acc.handle) + '</strong>' +
      '<a class="btn" data-chalk="pill" href="' + esc(acc.url) + '" rel="noopener" target="_blank">Follow us<span class="visually-hidden"> on Instagram, @' + esc(acc.handle) + ' (opens in a new tab)</span></a></div></div></div>' +
      '<figcaption><p class="reel__caption">School life, straight from our Instagram.</p></figcaption></figure>';
  }
  function reelCard(item) {
    var cap = (item.caption || "").split("\n")[0].slice(0, 120);
    var handle = item.username || item.account || "";
    var poster = item.thumbnail_local || item.thumbnail_url || item.media_url;
    var video = item.media_type === "VIDEO" ? (item.video_local || item.media_url) : null;
    return '<figure class="reel"><div class="reel__phone" data-chalk="phone"><span class="reel__notch" aria-hidden="true"></span><div class="reel__screen">' +
      '<span class="reel__handle">@' + esc(handle) + '</span>' +
      (video
        ? '<video class="reel__poster" muted loop playsinline preload="none" poster="' + esc(poster) + '" src="' + esc(video) + '" aria-label="Instagram reel: ' + esc(cap || "school life") + '"></video>' +
          '<button class="reel__sound" type="button" aria-pressed="false" aria-label="Unmute reel" data-sprite="' + SPRITE + '">' + '<svg aria-hidden="true"><use href="' + SPRITE + '#i-sound-off"/></svg></button>'
        : '<img class="reel__poster" loading="lazy" src="' + esc(poster) + '" alt="' + esc(cap || "Instagram post from @" + handle) + '">') +
      '</div></div><figcaption><p class="reel__caption">' + esc(cap) + '</p><a class="reel__link" href="' + esc(item.permalink) + '" rel="noopener" target="_blank">View on Instagram<span class="visually-hidden"> (opens in a new tab)</span></a></figcaption></figure>';
  }
  if (reelsRow) {
    var feedUrl = reelsRow.getAttribute("data-reels") || "/data/instagram.json";
    var limit = parseInt(reelsRow.getAttribute("data-limit"), 10) || 6;
    fetch(feedUrl, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      // Accept our cron JSON ({items:[...]}) or a Behold feed ({posts:[...]} or an array)
      var items = data && (data.items || data.posts || (Array.isArray(data) ? data : null));
      if (!items || !items.length) throw new Error("empty feed");
      items = items.filter(function (i) { return i.media_type === "VIDEO" || i.mediaType === "VIDEO" || i.media_product_type === "REELS"; }).slice(0, limit);
      if (!items.length) throw new Error("no reels");
      reelsRow.innerHTML = items.map(reelCard).join("");
    }).catch(function () {
      reelsRow.innerHTML = ACCOUNTS.map(followCard).join("");
    }).then(function () {
      document.dispatchEvent(new CustomEvent("vnl:content"));
    });
  }

  /* ---------- Back to top: the duster wipes the board ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-wipe-top]");
    if (!btn) return;
    e.preventDefault();
    var target = document.getElementById("top") || document.body;
    if (reduceMotion) { window.scrollTo(0, 0); target.focus({ preventScroll: true }); return; }
    var wipe = document.querySelector(".wipe");
    if (!wipe) {
      wipe = document.createElement("div");
      wipe.className = "wipe"; wipe.setAttribute("aria-hidden", "true");
      wipe.innerHTML = '<span class="wipe__duster"></span>';
      document.body.appendChild(wipe);
    }
    wipe.classList.remove("is-wiping"); void wipe.offsetWidth; wipe.classList.add("is-wiping");
    setTimeout(function () { root.style.scrollBehavior = "auto"; window.scrollTo(0, 0); root.style.scrollBehavior = ""; target.focus({ preventScroll: true }); }, 500);
    setTimeout(function () { wipe.classList.remove("is-wiping"); }, 1200);
  });
})();
