import { chromium } from 'playwright-core';
import fs from 'node:fs';

const routes = fs.readFileSync(process.argv[2],'utf8').split(/\s+/).map(x=>x.trim()).filter(Boolean);
const b = await chromium.launch({channel:'chrome'});
const ctx = await b.newContext();
const out = {};
for (const r of routes) {
  const p = await ctx.newPage();
  p.on('dialog', d=>d.dismiss().catch(()=>{}));
  try {
    await p.goto('http://localhost:4400'+r, {waitUntil:'domcontentloaded', timeout:30000});
    const res = await p.evaluate(() => {
      const as = [...document.body.querySelectorAll('a')];
      const withHref = as.filter(a=>a.hasAttribute('href'));
      const internal = withHref.map(a=>a.getAttribute('href'))
        .map(h=>{ try { const u=new URL(h, location.href); return (u.hostname==='localhost')?u.pathname:(u.hostname.includes('waterautomation.com')?u.pathname:null); } catch { return null; } })
        .filter(Boolean);
      return { anchors: as.length, hrefs: withHref.length, internal: [...new Set(internal)].sort() };
    });
    out[r] = res;
    console.log(r, 'anchors=', res.anchors, 'hrefs=', res.hrefs, 'distinctInternal=', res.internal.length);
  } catch(e) { console.log(r, 'ERR', e.message.slice(0,120)); }
  await p.close();
}
await b.close();
fs.writeFileSync(process.argv[3], JSON.stringify(out,null,1));
