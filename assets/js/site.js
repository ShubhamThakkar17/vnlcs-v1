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

  var outlined = document.querySelectorAll("[data-chalk]");
  outlined.forEach(drawOutline);
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function (entries) { entries.forEach(function (en) { drawOutline(en.target); }); });
    outlined.forEach(function (el) { ro.observe(el); });
  }

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
      ann.show();
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
  var reels = document.querySelectorAll(".reel video");
  if (reels.length && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && !reduceMotion && !v.closest("[data-paused]")) {
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else { v.pause(); }
      });
    }, { threshold: 0.6 });
    reels.forEach(function (v) { v.muted = true; rio.observe(v); });
  }
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
  });

  applyTheme(currentTheme(), false);
})();
