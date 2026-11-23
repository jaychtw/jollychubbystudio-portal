import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, urljoin, unquote

ROOT = Path("public")
modules = json.loads(Path("migration/sources.json").read_text())[1:]
expected = {"/"+m["slug"]+"/" for m in modules}

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.assets = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and a.get("href","").startswith("/") and not a.get("download"):
            self.assets.append(a["href"])
        if tag == "a" and "data-project" in a:
            self.cards.append(a["href"])
        if tag in ("img","script","audio","video","source","iframe"):
            self.assets.append(a.get("src",""))
        if tag == "link" and a.get("rel") in ("icon","stylesheet","modulepreload"):
            self.assets.append(a.get("href",""))

cards = []
for file in [ROOT/"index.html",ROOT/"apps/index.html"]:
    p = Links()
    p.feed(file.read_text())
    cards.extend(p.cards)
assert len(cards) == len(expected) and set(cards) == expected, set(cards) ^ expected
for path in expected:
    assert (ROOT / path.strip("/") / "index.html").is_file(), path
errors = []
for page in ROOT.rglob("*.html"):
    p = Links()
    p.feed(page.read_text())
    for asset in p.assets:
        if not asset or asset.startswith(("#","data:","blob:","about:","//")) or "\u0024{" in asset:
            continue
        url = urlsplit(urljoin("https://studio.test/"+page.relative_to(ROOT).as_posix(),asset))
        if url.netloc != "studio.test":
            continue
        path = ROOT / unquote(url.path).lstrip("/")
        if not (path.is_file() or (path/"index.html").is_file() or path.with_suffix(".html").is_file()):
            errors.append(f"{page}: {asset}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"{len(cards)} catalog routes, {len(list(ROOT.rglob('*.html')))} HTML files checked")
