"""Assemble the pinned, public release inputs in public/ on the migration branch."""
import concurrent.futures
import urllib.request
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path.cwd()
OUT = ROOT / "public"
MODULES = json.loads((ROOT / "migration/sources.json").read_text())


def run(args, cwd):
    subprocess.run(args, cwd=cwd, check=True)


def assemble(item):
    repo, mode = item["repo"], item["mode"]
    if mode == "firebase":
        dest = OUT / item["slug"]
        dest.mkdir(exist_ok=True)
        snapshot = subprocess.run(["git", "show", "HEAD:public/travelcanvas/index.html"], capture_output=True)
        if snapshot.returncode == 0:
            body = snapshot.stdout
        else:
            with urllib.request.urlopen(item["live"], timeout=30) as response:
                body = response.read()
        if b"firebase-config.json" not in body:
            raise ValueError("Use the studio Travel Canvas entry with external SDK configuration")
        if b"TravelCanvas" not in body or b"firebase" not in body:
            raise ValueError("Unexpected Travel Canvas entry")
        (dest / "index.html").write_bytes(body)
        return
    dest = OUT / item["slug"]
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp)
        run(["git", "init", "-q"], src)
        run(["git", "fetch", "-q", "--depth=1", "https://github.com/jaychtw/" + repo + ".git", item["revision"]], src)
        run(["git", "checkout", "-q", "--detach", "FETCH_HEAD"], src)
        output = src
        if mode == "single-html":
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src / "index.html", dest / "index.html")
            return
        if mode == "build":
            output = src / "dist"
            if repo == "armorheart":
                run(["python3", "tools/build_v1_release.py"], src)
                output = src / ".release-site"
            elif repo == "shadow-becomes-me":
                run(["python3", "scripts/publication/prepare.py"], src)
                output = src / ".publication/site"
            elif repo in ("wonderlands", "reppublic-of-chickens"):
                archive = next((src / "release").glob("*.zip"))
                with zipfile.ZipFile(archive) as z:
                    z.extractall(output)
                if repo == "wonderlands":
                    output = output / "Wonderlands"
            else:
                if (src / "package-lock.json").exists():
                    run(["npm", "ci", "--no-audit", "--no-fund"], src)
                run(["npm", "run", "build:review" if repo == "junctioneer" else "build"], src)
                if repo == "the-butterfly-department":
                    output = output / repo
        elif mode == "site":
            output = src / "site"
        if not (output / "index.html").is_file():
            raise ValueError(f"Missing entry for {repo}: {output}")
        skip = shutil.ignore_patterns(".*", "README*", "docs", "tests", "*.command", "*.py", "*.map") if output == src else shutil.ignore_patterns(".*", "*.map")
        shutil.copytree(output, dest, dirs_exist_ok=True, ignore=skip)
        if item["slug"]:
            for notice in src.rglob("*"):
                if any(part in (".git", "node_modules") for part in notice.relative_to(src).parts):
                    continue
                name = notice.name.lower().split(".")[0].replace("_", "-")
                if not notice.is_file() or name not in {"license", "licence", "notice", "third-party-notices", "attribution", "credits"}:
                    continue
                if not (dest / notice.name).exists():
                    target = dest / "licenses" / (notice.relative_to(src).as_posix() + ".txt")
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(notice, target)
        print("Assembled", repo, flush=True)


if __name__ == "__main__":
    assemble(MODULES[0])
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(assemble, item): item for item in MODULES[1:]}
        failures = []
        for f in concurrent.futures.as_completed(futures):
            try:
                f.result()
            except Exception as exc:
                failures.append(f"{futures[f]['repo']}: {exc}")
        if failures:
            raise SystemExit("\n".join(failures))
