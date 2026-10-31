// Assembles static pages from src/pages/*.html + shared partials. No dependencies.
// Run: node tools/build.js
//
// Page file format: a JSON block in the first HTML comment, then the <main> content.
//   <!--{ "title": "...", "description": "...", "path": "/", "nav": "home" }-->
// Shortcodes inside page content:
//   <x-photo name="library" alt="..." sizes="(min-width: 64rem) 30vw, 60vw" eager></x-photo>
//   <x-icon id="i-phone"></x-icon>   <x-doodle id="d-star" vb="0 0 64 64"></x-doodle>
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SITE = JSON.parse(fs.readFileSync(path.join(SRC, 'site.json'), 'utf8'));
const PHOTOS = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/img/photos/manifest.json'), 'utf8'));
const SPRITE = '/assets/doodles/sprite.svg';
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function attrs(str) {
  const out = {};
  str.replace(/([\w-]+)(?:="([^"]*)")?/g, (_, k, v) => { out[k] = v === undefined ? true : v; });
  return out;
}

function photo(a) {
  const m = PHOTOS[a.name];
  if (!m) throw new Error('Unknown photo: ' + a.name);
  const widths = Object.keys(m).map(Number).sort((x, y) => x - y);
  const big = m[String(widths[widths.length - 1])];
  const set = ext => widths.map(w => `/assets/img/photos/${a.name}-${w}.${ext} ${w}w`).join(', ');
  const sizes = a.sizes || '(min-width: 64rem) 30vw, 80vw';
  const loading = a.eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="/assets/img/photos/${a.name}-${widths[widths.length - 1]}.webp" width="${big[0]}" height="${big[1]}" alt="${esc(a.alt || '')}" ${loading}></picture>`;
}

function shortcodes(html) {
  return html
    .replace(/<x-photo([^>]*)><\/x-photo>/g, (_, a) => photo(attrs(a)))
    .replace(/<x-icon([^>]*)><\/x-icon>/g, (_, a) => { a = attrs(a); return `<svg class="${a.class || 'icon'}" aria-hidden="true" focusable="false"><use href="${SPRITE}#${a.id}"/></svg>`; })
    .replace(/<x-doodle([^>]*)><\/x-doodle>/g, (_, a) => { a = attrs(a); return `<svg viewBox="${a.vb || '0 0 64 64'}" aria-hidden="true" focusable="false"><use href="${SPRITE}#${a.id}"/></svg>`; });
}

function schemaSchool() {
  return {
    '@context': 'https://schema.org',
    '@type': 'School',
    '@id': SITE.url + '/#school',
    name: SITE.name,
    alternateName: 'Veer New Look',
    url: SITE.url + '/',
    logo: SITE.url + '/assets/img/logo-new-look.png',
    foundingDate: '2005',
    slogan: 'Play, Learn & Grow Together!',
    telephone: ['+91-2676-225955', '+91-8000201153'],
    email: SITE.emails,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Godhra Road, beside HDFC Bank',
      addressLocality: 'Halol',
      addressRegion: 'Gujarat',
      postalCode: '389350',
      addressCountry: 'IN'
    },
    parentOrganization: { '@type': 'Organization', name: 'New Look Group of Institutions', url: 'https://newlookschool.com/' },
    sameAs: SITE.instagram.map(i => i.url)
  };
}

function breadcrumb(page) {
  if (page.path === '/') return null;
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url + '/' },
      { '@type': 'ListItem', position: 2, name: page.crumb || page.title, item: SITE.url + page.path }
    ]
  };
}

function navItems(active, cls) {
  return SITE.nav.map(n => `<li><a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a></li>`).join('');
}

function render(page, body) {
  const ld = [schemaSchool(), breadcrumb(page)].filter(Boolean);
  const vars = {
    title: esc(page.title),
    description: esc(page.description),
    canonical: SITE.url + page.path,
    ogImage: SITE.url + (page.ogImage || '/assets/img/og-default.png'),
    jsonld: ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n'),
    nav: navItems(page.nav),
    navMobile: navItems(page.nav),
    year: new Date().getFullYear(),
    bodyClass: page.bodyClass || ''
  };
  let html = read('partials/layout.html')
    .replace('{{head}}', read('partials/head.html'))
    .replace('{{header}}', read('partials/header.html'))
    .replace('{{footer}}', read('partials/footer.html'))
    .replace('{{main}}', body);
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  return shortcodes(html);
}

let count = 0;
for (const file of fs.readdirSync(path.join(SRC, 'pages'))) {
  if (!file.endsWith('.html')) continue;
  const raw = read('pages/' + file);
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(file + ': missing JSON front matter');
  const page = JSON.parse(m[1]);
  const out = page.path.endsWith('/') ? path.join(ROOT, page.path, 'index.html') : path.join(ROOT, page.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(page, raw.slice(m[0].length)));
  console.log('built', path.relative(ROOT, out));
  count++;
}
console.log(count + ' page(s)');
