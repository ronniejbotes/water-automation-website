import { chromium } from 'playwright-core';
import fs from 'fs';
const exe = "C:/Users/ronja/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const cities=["boston","chicago","dallas","fort-lauderdale","houston","miami","new-york","washington-dc"];
const b = await chromium.launch({executablePath: exe});
const p = await b.newPage({viewport:{width:1440,height:900}});
const out={};
for (const c of cities){
  await p.goto(`http://localhost:4400/water-leak-protection-${c}/`, {waitUntil:'networkidle', timeout:60000});
  await p.waitForTimeout(2000);
  const r = await p.evaluate(()=>{
    const vis = document.body.innerText.replace(/\s+/g,' ').trim();
    return {vis, visLen: vis.length,
      h1: [...document.querySelectorAll('h1')].map(h=>h.innerText.trim()),
      h2: [...document.querySelectorAll('h2')].map(h=>h.innerText.trim()),
      title: document.title,
      metadesc: [...document.querySelectorAll('meta[name="description"]')].map(m=>m.content),
      canonical: document.querySelector('link[rel=canonical]')?.href||null,
      anchors: [...document.querySelectorAll('body a[href]')].length};
  });
  out[c]=r;
  console.log(`${c.padEnd(18)} visLen=${String(r.visLen).padStart(6)} anchors=${r.anchors} h1=${JSON.stringify(r.h1)}`);
  console.log(`   title: ${r.title}`);
  console.log(`   canonical: ${r.canonical}`);
  console.log(`   metadesc(${r.metadesc.length}): ${JSON.stringify(r.metadesc.map(m=>m.slice(0,100)))}`);
}
await b.close();
fs.writeFileSync(process.argv[2], JSON.stringify(out,null,1));
