# Veer New Look Central School, Halol: website

Hand-drawn chalk on a school board. Two themes from one set of components: **Blackboard** (default) and **Whiteboard**.
Static HTML, one CSS file and vanilla JS, with PHP 8 only where the site needs live data (notices, newsletter, albums, Instagram cron). Hosted on Hostinger.

> Work in progress. Built in the order agreed in the brief. Full setup notes (Sanity, cron jobs, token refresh, switching to Behold) arrive with step 4.

## Progress

- [x] **Step 1: style tile** in both themes: `/style-tile/` · screenshots in `docs/review/step-1-style-tile/`
- [x] **Step 2: Home** in both themes at 375 px and 1440 px: `/` · screenshots in `docs/review/step-2-home/`
- [ ] Step 3: remaining pages
- [ ] Step 4: Sanity schema and Studio, PHP notice pages, Instagram cron jobs
- [ ] Step 5: QA pass and deploy-ready zip

## Run it locally

Pages are written in `src/pages/` and assembled with the shared header and footer by a zero-dependency build script. The built HTML is committed, so Hostinger and Vercel serve plain files.

```bash
node tools/build.js
php -S 127.0.0.1:8080 -t .
```

Then open http://127.0.0.1:8080/

## Motion

All motion is CSS plus IntersectionObserver (no animation library): headline written line by line, chalk-wipe headings, taped photos and notes dropping in, doodles drawing themselves, scroll-linked parallax and a chalk reading-progress line (where the browser supports scroll timelines), marquees with pause buttons, and the duster wiping the board on Back to top. `prefers-reduced-motion` switches all of it off.

## Checks

```bash
npm install
npm run contrast           # WCAG ratios for both themes -> docs/contrast-report.md
node tools/axe.js /style-tile/   # axe-core audit, both themes, 375 and 1440 px (needs the local server)
node tools/shoot.js / scratch/shots/home   # screenshots, both themes, 375 and 1440 px
node tools/weight.js /     # page weight before and after scrolling
```

## Layout so far

```
assets/css/site.css        one stylesheet, theme tokens as custom properties
assets/js/site.js          theme toggle, chalk outlines, Rough Notation on scroll, reels
assets/js/vendor/          Rough Notation 0.5.1 (MIT, 10.7 KB)
assets/fonts/              Cabin Sketch, Kalam, Nunito; self-hosted, subset to Latin (~97 KB total)
assets/img/                board textures: chalk dust 14.5 KB, marker ghosts 4.7 KB
assets/doodles/sprite.svg  original hand-drawn doodles and icons (currentColor)
assets/img/photos/         the school's own photos (from the old site) as AVIF + WebP, 320 and 560 px
src/                       page sources, shared partials, site settings
data/                      notices-latest.json (sample until Sanity), instagram.json (written by cron)
tools/                     dev-only scripts (textures, contrast, axe, screenshots)
docs/                      contrast report, review screenshots
```

## Ownership

The site, domain and content belong to Veer New Look Central School, Halol (Manibhadra Veer Education Trust). Website by KeshavCo.
