"""Localize the assembled release and check the directory structure before staging."""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path("public")
DOMAIN = "https://jollychubbystudio.com"
OLD = "https://jaychtw.github.io"
SUPPORT = "support@jollychubbystudio.com"
MODULES = json.loads(Path("migration/sources.json").read_text())[1:]
SLUGS = {m["slug"] for m in MODULES}
TEXT = {".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".svg", ".xml", ".txt"}
FOOT = '<a href="/privacy" data-zh="隱私權">Privacy</a> · <a href="/terms" data-zh="使用條款">Terms</a> · <a href="mailto:'+SUPPORT+'">'+SUPPORT+'</a>'


def localize(file, content, module):
    for m in MODULES:
        live = m["live"].rstrip("/")
        slug = m["slug"]
        content = re.sub(re.escape(live) + r'(?=/|["\'#?\s<])', "/" + slug, content)
        if module and m["repo"] != slug:
            content = content.replace("/" + m["repo"] + "/", "/" + slug + "/")
    if module == "travelcanvas":
        return content
    if module:
        directory = file.parent
        # Only rewrite a root path when it refers to a shipped resource.
        def resolve(match):
            lead, value = match.groups()
            path = urlsplit(value).path
            if path.startswith("//") or not path.strip("/"):
                return match.group()
            target = ROOT / path.lstrip("/")
            if not target.exists():
                target = ROOT / module / path.lstrip("/")
            if not target.exists():
                return match.group()
            if path.rstrip("/").lstrip("/") in SLUGS:
                return lead + path.rstrip("/") + "/" + value[len(path):]
            uses_module_url = re.match(r"""["']\s*,\s*import\.meta\.url""", content[match.end():])
            base = directory if file.suffix in (".html", ".css") or uses_module_url else ROOT / module
            relative = os.path.relpath(target, base)
            if not relative.startswith("."):
                relative = "./" + relative
            return lead + relative + ("/" if path.endswith("/") else "") + value[len(path):]
        content = re.sub(r'''(["'\x60(])(/(?!/)[^"'\x60()\\\s<>]*)''', resolve, content)
        content = content.replace(OLD + "/", "/").replace(OLD + '"', '/"')
    else:
        content = content.replace(OLD, DOMAIN).replace("Possibility", "Jolly Chubby Studio").replace("jay.yc.chen@gmail.com", SUPPORT)
        if file.suffix == ".html":
            content = content.replace("</footer>", " · " + FOOT + "</footer>")
            for m in MODULES:
                content = content.replace('href="/' + m["slug"] + '"', 'href="/' + m["slug"] + '/"')
    return content


for file in ROOT.rglob("*"):
    if not file.is_file() or file.suffix.lower() not in TEXT:
        continue
    module = file.relative_to(ROOT).parts[0]
    source = file.read_text()
    result = localize(file, source, module if module in SLUGS else None)
    if source != result:
        file.write_text(result)

for name, title, zh, eng, chinese in [
    ("privacy", "Privacy", "隱私權", "Games and apps may save preferences or progress in your browser. Clearing site data removes local copies. Shared features can transmit the information you submit. Embedded media, maps and live streams connect to their providers when loaded. Hosting providers receive connection information when serving pages. Email the studio with privacy questions or to request help with data you shared.", "遊戲與應用程式可能會將偏好設定或進度儲存在瀏覽器中。清除網站資料會移除本機副本。使用共享功能時，您提交的資訊可能會傳送至服務提供者。載入嵌入式媒體、地圖與直播時，瀏覽器會連線至相關供應商。代管服務會在提供網頁時接收連線資訊。若有隱私疑問或需要處理已分享的資料，請來信聯絡。"),
    ("terms", "Terms of use", "使用條款", "You may play, read and explore the works hosted here. Individual works may include separately licensed software, artwork and services. Their published license terms apply to those materials. Only share content you have permission to share. Direct questions about reuse, attribution or support to the studio.", "歡迎遊玩、閱讀與探索本站作品。個別作品可能包含另行授權的軟體、美術素材與服務，相關素材適用其公布的授權條款。請僅分享您有權分享的內容。如有再利用、出處標示或支援問題，請聯絡工作室。")
]:
    (ROOT / (name+".html")).write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · Jolly Chubby Studio</title><link rel="canonical" href="{DOMAIN}/{name}"><main style="max-width:44rem;margin:3rem auto;padding:1rem;font:1.1rem/1.65 system-ui"><a href="/">Jolly Chubby Studio</a><h1>{title}</h1><p>{eng}</p><section lang="zh-Hant"><h2>{zh}</h2><p>{chinese}</p></section><footer>{FOOT}</footer></main></html>')
(ROOT / "ads.txt").write_text("# Jolly Chubby Studio\n# No authorized advertising sellers listed.\n")
ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", ns)
tree = ET.parse(ROOT / "sitemap.xml")
for route in ["/"+s+"/" for s in sorted(SLUGS)] + ["/privacy", "/terms"]:
    url = ET.SubElement(tree.getroot(), "{"+ns+"}url")
    ET.SubElement(url, "{"+ns+"}loc").text = DOMAIN+route
tree.write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)

# Keep the studio badge independent of the Possibility source build.
import base64
import shutil
branding = Path("branding")
for name in ("bear-badge-v1.png", "favicon.ico"):
    shutil.copyfile(branding / name, ROOT / name)
png = base64.b64encode((branding / "bear-badge-v1.png").read_bytes()).decode("ascii")
(ROOT / "favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,' + png + '"/></svg>\n')
for page in ROOT.rglob("*.html"):
    if page.relative_to(ROOT).parts[0] in SLUGS:
        continue
    original = page.read_text()
    updated = re.sub(r'href="/assets/possibility/favicon\.[a-z0-9]+\.svg" type="image/svg\+xml"', 'href="/bear-badge-v1.png" type="image/png" sizes="128x128"', original)
    if original != updated:
        page.write_text(updated)
