import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {marked} from "marked";
import {parse} from "yaml";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "firebase.json"), "utf8"));
const output = resolve(root, config.hosting.public);
const destination = join(output, "blog");
const origin = "https://jollychubbystudio.com";
const language = {en: "en", zh: "zh-Hant"};
const posts = new Map();
const published = [];
const read = file => readFileSync(file, "utf8");
const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
const url = page => `/blog/${page.locale}/${page.slug}/`;
const coverUrl = page => url(page) + page.cover.split("/").map(encodeURIComponent).join("/");
const files = dir => readdirSync(dir, {withFileTypes:true});
const blogLink = '<a href="/blog/" data-zh="部落格">Blog</a>';

function insertNav(html) {
  return html.replace(/<nav aria-label="Collections"[^>]*>[\s\S]*?<\/nav>/, nav =>
    nav.includes('href="/blog/"') ? nav : nav.replace("</nav>", blogLink + "</nav>"));
}

for (const entry of files(join(root, "posts"))) {
  if (!entry.isDirectory()) continue;
  const match = /^\d{4}-\d{2}-\d{2}-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(entry.name);
  if (!match) throw Error(`Invalid dated post folder: ${entry.name}`);
  const slug = match[1];
  if (posts.has(slug)) throw Error(`Duplicate post slug "${slug}": ${posts.get(slug).folder} and ${entry.name}`);
  const post = {folder:entry.name, translations:{}};
  posts.set(slug, post);
  const directory = join(root, "posts", entry.name);
  for (const locale of Object.keys(language)) {
    const file = join(directory, locale + ".md");
    if (!existsSync(file)) continue;
    const parts = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(read(file).replace(/^\uFEFF/,""));
    if (!parts) throw Error(`Missing YAML frontmatter in ${file}`);
    const data = parse(parts[1]) ?? {};
    if (data.draft === true) continue;
    if (typeof data.title !== "string" || !data.title.trim()) throw Error(`Missing title in ${file}`);
    const date = String(data.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toJSON()?.slice(0,10) !== date) throw Error(`Missing or invalid date in ${file}`);
    if (data.tags && (!Array.isArray(data.tags) || data.tags.some(t => typeof t !== "string"))) throw Error(`Expected a list of text tags in ${file}`);
    const cover = (data.cover ?? "").replace(/^\.\//,"");
    if (cover && (cover.split("/").some(p => !p || p.startsWith(".")) || !existsSync(join(directory,cover)) || !statSync(join(directory,cover)).isFile())) throw Error(`Invalid cover "${cover}" in ${file}`);
    const page = {slug, directory, locale, title:data.title, date, tags:data.tags ?? [], summary:data.summary ?? "", cover, body:marked.parse(parts[2])};
    post.translations[locale] = page;
    published.push(page);
  }
}

const template = insertNav(read(join(output, "apps/index.html")));
function extract(regex) {
  const result = template.match(regex);
  if (!result) throw Error(`Expected portal markup missing: ${regex}`);
  return result[0];
}
const sharedHead = extract(/<link rel="icon"[\s\S]*?<\/head>/).replace("</head>", "");
const security = extract(/<meta http-equiv="Content-Security-Policy"[^>]+>/);
const header = extract(/<a class="skip-link"[\s\S]*?<\/header>/)
  .replace(/ aria-current="page"/g, "").replace('href="/blog/"', 'href="/blog/" aria-current="page"');
const footer = extract(/<footer class="site-footer"[\s\S]*?<\/footer>/);

function chineseShell(html) {
  return html.replace(/data-zh="([^"]+)">[^<]*</g, 'data-zh="$1">$1<')
    .replace('aria-label="Collections"', 'aria-label="作品分類"');
}
function shell({title, summary, path, page, content}) {
  const locale = page?.locale ?? "en";
  const other = locale === "en" ? "zh" : "en";
  const counterpart = page && posts.get(page.slug).translations[other];
  const links = counterpart ? Object.entries(language).map(([key,lang]) => `<link rel="alternate" hreflang="${lang}" href="${origin}/blog/${key}/${page.slug}/">`).join("\n") : "";
  let nav = header;
  if (page) {
    const label = other === "zh" ? "繁" : "En";
    const name = other === "zh" ? "切換至繁體中文" : "Switch to English";
    const missing = other === "zh" ? "Traditional Chinese translation unavailable" : "暫無英文版";
    const toggle = counterpart ? `<a class="blog-switch" href="${url(counterpart)}" hreflang="${language[other]}" title="${name}" aria-label="${name}">${label}</a>` : `<button class="blog-switch" disabled title="${missing}" aria-label="${missing}">${label}</button>`;
    nav = nav.replace(/<button[^>]+class="language-toggle"[^>]*>.*?<\/button>/,toggle);
  }
  const image = page?.cover ? coverUrl(page) : "/blog/studio-share.jpg";
  return `<!doctype html>
<html lang="${language[locale]}" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${security}<meta name="color-scheme" content="dark light"><meta name="theme-color" content="#202120">
<title>${escape(title)} · Jolly Chubby Studio</title><meta name="description" content="${escape(summary)}">
<link rel="canonical" href="${origin}${path}">${links}
<meta property="og:site_name" content="Jolly Chubby Studio"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(summary)}">
<meta property="og:type" content="${page?"article":"website"}"><meta property="og:url" content="${origin}${path}"><meta property="og:locale" content="${locale==="zh"?"zh_TW":"en_US"}"><meta property="og:image" content="${escape(origin+image)}"><meta name="twitter:card" content="${page?.cover?"summary_large_image":"summary"}">
${sharedHead}<link rel="stylesheet" href="/blog/blog.css"><script defer src="/blog/preferences.js"></script></head>
<body>${locale==="zh"?chineseShell(nav):nav}<main id="main" class="blog-main" tabindex="-1">${content}</main>${locale==="zh"?chineseShell(footer):footer}</body></html>\n`;
}
const time = p => `<time datetime="${p.date}">${p.date}</time>`;
const tags = p => p.tags.length ? `<ul class="blog-tags">${p.tags.map(t=>`<li>${escape(t)}</li>`).join("")}</ul>` : "";
function listing(locale) {
  const entries = [...posts.values()].map(({translations:t})=>t[locale] ?? t.en ?? t.zh).filter(Boolean)
    .sort((a,b)=>b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  if (!entries.length) return `<p data-list="${locale}">${locale==="zh"?"目前尚無文章。":"No posts yet."}</p>`;
  return `<ol class="blog-list" data-list="${locale}">${entries.map(p=>{
    const only = Object.keys(posts.get(p.slug).translations).length===1;
    const label = locale==="zh" ? (p.locale==="zh"?"僅中文":"僅英文") : (p.locale==="zh"?"繁中 only":"EN only");
    return `<li lang="${language[p.locale]}">${p.cover?`<img class="blog-thumb" src="${escape(coverUrl(p))}" alt="" loading="lazy">`:""}${time(p)} ${only?`<span class="blog-only" lang="${language[locale]}">[${label}]</span>`:""}<h2><a href="${url(p)}">${escape(p.title)}</a></h2><p>${escape(p.summary)}</p>${tags(p)}</li>`;
  }).join("")}</ol>`;
}
function copyAssets(source, target) {
  for (const item of files(source)) {
    const from = join(source,item.name), to = join(target,item.name);
    if (item.isDirectory()) { mkdirSync(to,{recursive:true}); copyAssets(from,to); }
    else if (item.isFile() && !/\.md$/i.test(item.name)) {
      if (to === join(target,"index.html") && existsSync(to)) throw Error(`Post asset conflicts with generated page: ${from}`);
      copyFileSync(from,to);
    }
  }
}
const staging = mkdtempSync(join(output,".blog-"));
try {
  for (const asset of files(join(root,"scripts/blog"))) copyFileSync(join(root,"scripts/blog",asset.name),join(staging,asset.name));
  writeFileSync(join(staging,"index.html"),shell({title:"Blog",summary:"Notes from Jolly Chubby Studio.",path:"/blog/",content:`<h1 data-zh="部落格">Blog</h1>${listing("en")}${listing("zh")}`}));
  for (const p of published) {
    const dir = join(staging,p.locale,p.slug);
    mkdirSync(dir,{recursive:true});
    const content = `<a class="blog-back" href="/blog/">${p.locale==="zh"?"所有文章":"All posts"}</a><article><header>${time(p)}<h1>${escape(p.title)}</h1><p>${escape(p.summary)}</p>${tags(p)}</header>${p.cover?`<img class="blog-cover" src="${escape(coverUrl(p))}" alt="">`:""}<div class="blog-prose">${p.body}</div></article>`;
    writeFileSync(join(dir,"index.html"),shell({title:p.title,summary:p.summary,path:url(p),page:p,content}));
    copyAssets(p.directory,dir);
  }
  rmSync(destination,{recursive:true,force:true});
  renameSync(staging,destination);
} finally { rmSync(staging,{recursive:true,force:true}); }

// Refresh pages that belong to the portal shell. Standalone apps own their navigation.
const portalPages = ["index.html","404.html","privacy.html","terms.html"];
for (const section of ["games","apps","bookshelf","what-now"]) {
  const dir = join(output,section);
  if (existsSync(dir)) portalPages.push(...readdirSync(dir,{recursive:true}).filter(f=>f.endsWith(".html")).map(f=>join(section,f)));
}
for (const file of portalPages) {
  const path = join(output,file);
  if (!existsSync(path)) continue;
  const source = read(path);
  let result = insertNav(source);
  if (["privacy.html","terms.html"].includes(file) && !result.includes('href="/blog/"')) result=result.replace("<footer>",`<footer>${blogLink} · `);
  if (source !== result) writeFileSync(path,result);
}
const sitemap = join(output,"sitemap.xml");
const previous = read(sitemap).replace(/<url>\s*<loc>https:\/\/jollychubbystudio\.com\/blog\/[^<]*<\/loc>\s*<\/url>\s*/g,"");
const routes = ["/blog/",...published.map(url)];
writeFileSync(sitemap,previous.replace("</urlset>",routes.map(r=>`<url><loc>${origin}${r}</loc></url>`).join("")+"</urlset>"));
console.log(`Built /blog/ with ${published.length} published language editions.`);
