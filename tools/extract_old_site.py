"""Extract visible text, links and images from saved old-site HTML.
Usage: python3 -I tools/extract_old_site.py <dir-with-html> > out.txt"""
import sys, os, re
from html.parser import HTMLParser

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.skip = 0; self.out = []; self.links = []; self.imgs = []
    def handle_starttag(self, t, a):
        a = dict(a)
        if t in ("script", "style", "noscript"): self.skip += 1
        if t == "a" and a.get("href"): self.links.append(a["href"])
        if t == "img" and a.get("src"): self.imgs.append((a["src"], a.get("alt", "")))
        if t in ("p", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "div", "td"): self.out.append("\n")
        if t in ("td", "th"): self.out.append(" | ")
    def handle_endtag(self, t):
        if t in ("script", "style", "noscript"): self.skip -= 1
    def handle_data(self, d):
        if not self.skip: self.out.append(d)

d = sys.argv[1]
for f in sorted(os.listdir(d)):
    if not f.endswith(".html"): continue
    p = P(); p.feed(open(os.path.join(d, f), encoding="utf-8", errors="replace").read())
    text = re.sub(r"[ \t\r\xa0]+", " ", "".join(p.out))
    text = re.sub(r"\n\s*\n+", "\n", text).strip()
    print("=" * 30, f, "=" * 30)
    print(text)
    print("-- links:", sorted(set(l for l in p.links if not l.endswith(".html") or l.startswith("http"))))
    print("-- imgs:", p.imgs)
