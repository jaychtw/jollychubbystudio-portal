// Run against the Hosting emulator or a deployed origin.
const { chromium } = require('playwright');
const fs = require('node:fs');
const base = process.env.STUDIO_ORIGIN || 'http://127.0.0.1:5000';
const modules = JSON.parse(fs.readFileSync('migration/sources.json')).slice(1);
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const failures = [];
  const paths = ['/', '/apps/', '/bookshelf/', '/privacy', '/terms', ...modules.map(m=>'/'+m.slug+'/')];
  // Visit nested HTML entries as well as the top-level cards.
  function collect(dir) {
    for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
      const file = dir+'/'+e.name;
      if (e.isDirectory()) collect(file);
      else if (e.name.endsWith('.html')) paths.push(file.slice(6).replace(/\/index\.html$/,'/').replace(/\.html$/,''));
    }
  }
  for (const m of modules) collect('public/'+m.slug);
  const queue = [...new Set(paths)];
  async function visit() {
    for (let path; (path = queue.shift());) {
      const context = await browser.newContext({viewport:{width:900,height:760}});
      const page = await context.newPage();
      page.on('response', r=>{
        const url = new URL(r.url());
        if (url.origin === base && r.status() >= 400 && url.pathname !== '/favicon.ico') failures.push([path,r.status(),url.pathname]);
      });
      page.on('pageerror', e=>failures.push([path,'JavaScript',e.message.slice(0,220)]));
      try {
        const r = await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:45000});
        if (!r || r.status()!==200) failures.push([path,'entry',r?.status()]);
        await page.waitForTimeout(650);
        if(path === '/wdic/') {
          const data = await page.evaluate(async()=>{const r=await fetch('events.json'); return {status:r.status, feed: (await r.json()).generated};});
          if(data.status!==200 || typeof data.feed!=='number') failures.push([path,'live feed',data]);
        }
        if(path === '/travelcanvas/') {
          // Wait for Firebase authentication, without opening or editing any trip.
          await page.waitForFunction(()=>document.body.innerText.trim().length>40,{},{timeout:10000});
        }
        if (!(await page.locator('body').innerText()).trim() && !(await page.locator('canvas,iframe,svg,img').count())) failures.push([path,'empty']);
      } catch(e) {failures.push([path,e.message.slice(0,200)]);}
      finally {await context.close();}
    }
  }
  try {await Promise.all(Array.from({length:3},visit));} finally {await browser.close();}
  if (failures.length) {console.error(JSON.stringify(failures,null,2));process.exitCode=1;}
  else console.log('Browser checked',new Set(paths).size,'routes');
})().catch(e=>{console.error(e);process.exitCode=1;});
